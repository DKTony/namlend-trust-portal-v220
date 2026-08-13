#!/usr/bin/env node
import path from 'node:path';
import { matchesAny, readJson, ROOT } from './lib.mjs';

const GITHUB_API_ORIGIN = 'https://api.github.com';
const REPOSITORY_OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;
const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const COLLABORATOR_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

export function requiredApprovals(files, policy) {
  const protectedFiles = files.filter((file) => matchesAny(file, policy.protectedPatterns));
  return {
    riskClass: protectedFiles.length ? 'PROTECTED' : 'STANDARD',
    required: protectedFiles.length
      ? policy.protectedMinimumHumanApprovals
      : policy.minimumHumanApprovals,
    protectedFiles,
  };
}

export function currentApprovers(reviews, headSha, author) {
  const decisive = new Map();
  const ordered = [...reviews].sort((left, right) =>
    String(left.submitted_at ?? '').localeCompare(String(right.submitted_at ?? ''))
  );
  for (const review of ordered) {
    const login = review.user?.login;
    const state = String(review.state ?? '').toUpperCase();
    const association = String(review.author_association ?? '').toUpperCase();
    if (
      !login ||
      login === author ||
      review.user?.type === 'Bot' ||
      login.endsWith('[bot]') ||
      !COLLABORATOR_ASSOCIATIONS.has(association) ||
      !['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(state)
    ) {
      continue;
    }
    decisive.set(login, { state, commitId: review.commit_id });
  }
  return [...decisive.entries()]
    .filter(([, review]) => review.state === 'APPROVED' && review.commitId === headSha)
    .map(([login]) => login)
    .sort();
}

export function validateRiskReviewInputs({ repository, pullNumber, headSha, author }) {
  const [owner, repositoryName, ...extraSegments] = String(repository ?? '').split('/');
  if (
    extraSegments.length > 0 ||
    !REPOSITORY_OWNER_PATTERN.test(owner ?? '') ||
    !REPOSITORY_NAME_PATTERN.test(repositoryName ?? '') ||
    repositoryName === '.' ||
    repositoryName === '..'
  ) {
    throw new Error('Invalid GITHUB_REPOSITORY.');
  }
  if (!/^[1-9]\d*$/.test(String(pullNumber ?? ''))) throw new Error('Invalid PR_NUMBER.');
  const numericPullNumber = Number(pullNumber);
  if (!Number.isSafeInteger(numericPullNumber)) throw new Error('Invalid PR_NUMBER.');
  if (!SHA_PATTERN.test(String(headSha ?? ''))) throw new Error('Invalid PR_HEAD_SHA.');
  if (!LOGIN_PATTERN.test(String(author ?? ''))) throw new Error('Invalid PR_AUTHOR.');
  return {
    repository: `${owner}/${repositoryName}`,
    pullNumber: String(numericPullNumber),
    headSha: String(headSha),
    author: String(author),
  };
}

export async function githubPages(pathname, token, fetchImplementation = globalThis.fetch) {
  if (
    typeof pathname !== 'string' ||
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname.includes('\\')
  ) {
    throw new Error('Refusing an invalid GitHub API path.');
  }
  const values = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(pathname, GITHUB_API_ORIGIN);
    if (
      url.origin !== GITHUB_API_ORIGIN ||
      url.username ||
      url.password ||
      !url.pathname.startsWith('/repos/')
    ) {
      throw new Error('Refusing a non-GitHub API origin or repository path.');
    }
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const response = await fetchImplementation(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    });
    if (!response.ok)
      throw new Error(`GitHub API ${response.status} while evaluating review policy.`);
    const pageValues = await response.json();
    if (!Array.isArray(pageValues)) throw new Error('GitHub API returned a non-list response.');
    values.push(...pageValues);
    if (pageValues.length < 100) return values;
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const pullNumber = process.env.PR_NUMBER;
  const headSha = process.env.PR_HEAD_SHA;
  const author = process.env.PR_AUTHOR;
  if (!token || !repository || !pullNumber || !headSha || !author) {
    throw new Error(
      'GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, PR_HEAD_SHA, and PR_AUTHOR are required.'
    );
  }
  const validated = validateRiskReviewInputs({ repository, pullNumber, headSha, author });

  const base = `/repos/${validated.repository}/pulls/${validated.pullNumber}`;
  const [fileRecords, reviews] = await Promise.all([
    githubPages(`${base}/files`, token),
    githubPages(`${base}/reviews`, token),
  ]);
  const policy = readJson(path.join(ROOT, 'agent-harness', 'policy.json'));
  const classification = requiredApprovals(
    fileRecords.map((item) => item.filename),
    policy
  );
  const approvers = currentApprovers(reviews, validated.headSha, validated.author);
  const report = {
    schemaVersion: '1.0.0',
    pullRequest: Number(validated.pullNumber),
    headSha: validated.headSha,
    riskClass: classification.riskClass,
    requiredApprovals: classification.required,
    currentHeadApprovers: approvers,
    protectedFiles: classification.protectedFiles,
    pass: approvers.length >= classification.required,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.pass) {
    throw new Error(
      `${classification.riskClass} changes require ${classification.required} distinct human approval(s) at the current head; found ${approvers.length}.`
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
