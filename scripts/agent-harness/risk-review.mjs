#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { matchesAny, readJson, ROOT } from './lib.mjs';

export function requiredApprovals(files, policy) {
  const protectedFiles = files.filter((file) => matchesAny(file, policy.protectedPatterns));
  return {
    riskClass: protectedFiles.length ? 'PROTECTED' : 'STANDARD',
    required: protectedFiles.length ? policy.protectedMinimumHumanApprovals : policy.minimumHumanApprovals,
    protectedFiles,
  };
}

export function currentApprovers(reviews, headSha, author) {
  const decisive = new Map();
  const ordered = [...reviews].sort((left, right) => String(left.submitted_at ?? '').localeCompare(String(right.submitted_at ?? '')));
  for (const review of ordered) {
    const login = review.user?.login;
    const state = String(review.state ?? '').toUpperCase();
    if (!login || login === author || review.user?.type === 'Bot' || !['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(state)) continue;
    decisive.set(login, { state, commitId: review.commit_id });
  }
  return [...decisive.entries()]
    .filter(([, review]) => review.state === 'APPROVED' && review.commitId === headSha)
    .map(([login]) => login)
    .sort();
}

async function githubPages(url, token) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}per_page=100&page=${page}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status} while evaluating review policy.`);
    const pageValues = await response.json();
    values.push(...pageValues);
    if (pageValues.length < 100) return values;
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repository || !eventPath) throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY, and GITHUB_EVENT_PATH are required.');
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const pull = event.pull_request;
  if (!pull?.number) throw new Error('The risk-review check must run for a pull request event.');
  const api = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const base = `${api}/repos/${repository}/pulls/${pull.number}`;
  const [fileRecords, reviews] = await Promise.all([
    githubPages(`${base}/files`, token),
    githubPages(`${base}/reviews`, token),
  ]);
  const policy = readJson(path.join(ROOT, 'agent-harness', 'policy.json'));
  const classification = requiredApprovals(fileRecords.map((item) => item.filename), policy);
  const approvers = currentApprovers(reviews, pull.head.sha, pull.user.login);
  const report = {
    schemaVersion: '1.0.0',
    pullRequest: pull.number,
    headSha: pull.head.sha,
    riskClass: classification.riskClass,
    requiredApprovals: classification.required,
    currentHeadApprovers: approvers,
    protectedFiles: classification.protectedFiles,
    pass: approvers.length >= classification.required,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.pass) {
    throw new Error(`${classification.riskClass} changes require ${classification.required} distinct human approval(s) at the current head; found ${approvers.length}.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
