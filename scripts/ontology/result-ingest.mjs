import fs from 'node:fs';
import path from 'node:path';
import { canonical, git, readJson, stableHash, writeJson } from './model.mjs';

function walkJson(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith('.json') ? [target] : [];
  return fs.readdirSync(target).sort().flatMap((name) => walkJson(path.join(target, name)));
}

function producerJob(sourceFile) {
  const name = path.basename(sourceFile).toLowerCase();
  if (name.includes('convex')) return 'convex-tests';
  if (name.includes('unit')) return 'unit-tests';
  if (name.includes('ontology')) return 'ontology';
  if (name.includes('playwright-api')) return 'playwright-api-smoke';
  if (name.includes('playwright-full')) return 'playwright-full-e2e';
  if (name.includes('playwright')) return 'e2e';
  return undefined;
}

function vitestResults(value, sourceFile) {
  if (!Array.isArray(value?.testResults)) return [];
  return value.testResults.flatMap((suite) =>
    (suite.assertionResults ?? [])
      .filter((assertion) => assertion.status === 'passed')
      .map((assertion) => ({
        framework: 'vitest',
        file: String(suite.name ?? '').replace(/^.*?:\s*/, '').replaceAll('\\', '/'),
        title: [...(assertion.ancestorTitles ?? []), assertion.title].filter(Boolean).join(' > ') || assertion.fullName,
        sourceFile,
        producerJob: producerJob(sourceFile),
        durationMs: assertion.duration,
      }))
  );
}

function playwrightResults(value, sourceFile) {
  if (!Array.isArray(value?.suites) || !value?.config) return [];
  const output = [];
  const visit = (suite, ancestors = []) => {
    const next = suite.title ? [...ancestors, suite.title] : ancestors;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const passed = (test.results ?? []).some((result) => result.status === 'passed');
        if (!passed) continue;
        output.push({
          framework: 'playwright',
          file: String(spec.file ?? suite.file ?? '').replaceAll('\\', '/'),
          title: [...next, spec.title].filter(Boolean).join(' > '),
          projectName: test.projectName,
          sourceFile,
          producerJob: producerJob(sourceFile),
          durationMs: (test.results ?? []).reduce((sum, result) => sum + Number(result.duration ?? 0), 0),
        });
      }
    }
    for (const child of suite.suites ?? []) visit(child, next);
  };
  for (const suite of value.suites) visit(suite);
  return output;
}

function normalizeFile(file, root) {
  const normalized = String(file).replaceAll('\\', '/');
  const relative = path.isAbsolute(normalized) ? path.relative(root, normalized).replaceAll('\\', '/') : normalized;
  return relative.replace(/^\.\//, '');
}

function worktreeDirty(root) {
  return Boolean(git(root, ['status', '--porcelain=v1', '--untracked-files=normal'], ''));
}

function matchNode(result, testNodes, root) {
  const file = normalizeFile(result.file, root);
  const sameFile = testNodes.filter((node) => node.path === file || file.endsWith(`/${node.path}`));
  const normalizedTitle = result.title.replace(/\s+/g, ' ').trim();
  return sameFile.find((node) => normalizedTitle === node.name || normalizedTitle.endsWith(node.name) || normalizedTitle.includes(node.name));
}

function graphDiff(root, baseSha) {
  if (!baseSha) return { baseSha: null, available: false, nodes: {}, edges: {} };
  const compare = (file, key) => {
    const beforeRaw = git(root, ['show', `${baseSha}:${file}`], '');
    const before = beforeRaw ? JSON.parse(beforeRaw)[key] ?? [] : [];
    const after = readJson(path.join(root, file))?.[key] ?? [];
    const left = new Map(before.map((item) => [item.id, item]));
    const right = new Map(after.map((item) => [item.id, item]));
    return {
      added: [...right.keys()].filter((id) => !left.has(id)).sort(),
      removed: [...left.keys()].filter((id) => !right.has(id)).sort(),
      changed: [...right.keys()].filter((id) => left.has(id) && JSON.stringify(canonical(left.get(id))) !== JSON.stringify(canonical(right.get(id)))).sort(),
    };
  };
  return { baseSha, available: true, nodes: compare('ontology/nodes.json', 'nodes'), edges: compare('ontology/edges.json', 'edges') };
}

export function ingestResults(root, inputs) {
  const files = [...new Set(inputs.flatMap((input) => walkJson(path.resolve(root, input))))];
  if (!files.length) throw new Error(`No machine-readable test result JSON found under: ${inputs.join(', ')}`);
  const parsed = [];
  const rejected = [];
  for (const file of files) {
    try {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      const results = [...vitestResults(value, file), ...playwrightResults(value, file)];
      if (results.length) parsed.push(...results);
    } catch (error) {
      rejected.push({ file, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  if (!parsed.length) throw new Error(`No passing named Vitest or Playwright results were parsed from ${files.length} JSON files.`);

  const nodes = readJson(path.join(root, 'ontology/nodes.json')).nodes;
  const baseLedger = readJson(path.join(root, 'ontology/evidence-ledger.json'));
  const testNodes = nodes.filter((node) => node.type === 'Test');
  const localDirty = !process.env.GITHUB_SHA && worktreeDirty(root);
  const sha = process.env.GITHUB_SHA ?? (localDirty ? 'WORKTREE' : git(root, ['rev-parse', 'HEAD']));
  const executionTier = process.env.GITHUB_SHA ? 'E1' : 'E3';
  const runId = process.env.GITHUB_RUN_ID ?? 'local';
  const jobId = process.env.GITHUB_JOB ?? 'local-ingest';
  const workflow = process.env.GITHUB_WORKFLOW ?? 'local evidence ingestion';
  const server = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
  const repository = process.env.GITHUB_REPOSITORY ?? 'local/namlend';
  const source = runId === 'local' ? 'local:test-results' : `${server}/${repository}/actions/runs/${runId}`;
  const timestamp = new Date().toISOString();
  const evidenceById = new Map(baseLedger.evidence.map((item) => [item.id, item]));
  const claimById = new Map(baseLedger.claims.map((item) => [item.id, item]));
  let upstreamResults = {};
  try {
    upstreamResults = JSON.parse(process.env.UPSTREAM_RESULTS_JSON ?? '{}');
  } catch {
    upstreamResults = {};
  }
  for (const [upstreamJobId, upstream] of Object.entries(upstreamResults)) {
    const evidenceId = `evidence:${stableHash(JSON.stringify({ runId, upstreamJobId, sha, result: upstream.result }), 16)}`;
    evidenceById.set(evidenceId, {
      id: evidenceId, tier: executionTier, source, url: source.startsWith('http') ? source : undefined,
      symbol: upstreamJobId, runId, jobId: upstreamJobId, workflow, commitSha: sha,
      extractedAt: timestamp, completedAt: timestamp,
      status: upstream.result === 'success' ? 'CURRENT' : 'BLOCKED', conclusion: upstream.result,
    });
    const subject = `ci-job:ci-web:${upstreamJobId}`;
    const claimId = `claim:${stableHash(JSON.stringify({ subject, predicate: 'CI_JOB_CONCLUSION', object: upstream.result }), 20)}`;
    claimById.set(claimId, {
      id: claimId, subject, predicate: 'CI_JOB_CONCLUSION', object: upstream.result,
      tier: executionTier, evidenceRefs: [evidenceId], status: upstream.result === 'success' ? 'CURRENT' : 'BLOCKED',
      source, commitSha: sha, timestamp,
      reasoning: 'The evidence-ledger job executed only after the identified upstream workflow job concluded.',
    });
  }
  let matched = 0;
  const unmatchedIdentities = [];
  for (const result of parsed) {
    const node = matchNode(result, testNodes, root);
    const subject = node?.id ?? `test-result:${result.framework}:${stableHash(`${result.file}|${result.title}`, 20)}`;
    const identity = `${result.framework}:${normalizeFile(result.file, root)}#${result.title}`;
    if (node) matched += 1;
    else unmatchedIdentities.push(identity);
    const producingJobId = result.producerJob ?? jobId;
    const evidenceId = `evidence:${stableHash(JSON.stringify({ identity, sha, runId, producingJobId }), 16)}`;
    evidenceById.set(evidenceId, {
      id: evidenceId,
      tier: executionTier,
      source,
      url: source.startsWith('http') ? source : undefined,
      path: normalizeFile(result.file, root),
      symbol: result.title,
      testIdentity: identity,
      framework: result.framework,
      projectName: result.projectName,
      runId,
      jobId: producingJobId,
      ledgerJobId: jobId,
      workflow,
      commitSha: sha,
      extractedAt: timestamp,
      completedAt: timestamp,
      durationMs: result.durationMs,
      status: 'CURRENT',
      conclusion: 'success',
    });
    const claimId = `claim:${stableHash(JSON.stringify({ subject, predicate: 'EXECUTION_PROVEN', object: identity }), 20)}`;
    claimById.set(claimId, {
      id: claimId,
      subject,
      predicate: 'EXECUTION_PROVEN',
      object: identity,
      tier: executionTier,
      evidenceRefs: [evidenceId],
      status: 'CURRENT',
      reasoning: 'Named test completed successfully in the identified workflow job at the identified head SHA.',
    });
  }

  const artifactDir = path.join(root, 'ontology', 'ci-artifact');
  fs.mkdirSync(artifactDir, { recursive: true });
  writeJson(path.join(artifactDir, 'evidence-ledger.json'), {
    schemaVersion: baseLedger.schemaVersion,
    commitSha: sha,
    extractedAt: timestamp,
    sourceRun: { workflow, runId, jobId, source },
    evidence: [...evidenceById.values()].sort((a, b) => a.id.localeCompare(b.id)),
    claims: [...claimById.values()].sort((a, b) => a.id.localeCompare(b.id)),
  });
  writeJson(path.join(artifactDir, 'result-summary.json'), {
    schemaVersion: '1.0.0', commitSha: sha, extractedAt: timestamp,
    inputFiles: files.map((file) => path.relative(root, file)), parsedPassingTests: parsed.length,
    matchedOntologyTests: matched, unmatchedTests: parsed.length - matched,
    unmatchedIdentities: [...new Set(unmatchedIdentities)].sort(), rejected,
  });
  writeJson(path.join(artifactDir, 'graph-diff.json'), graphDiff(root, process.env.GITHUB_BASE_SHA));
  const mergeReceiptPath = process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF === 'refs/heads/main'
    ? path.join(artifactDir, 'merge-receipt.json')
    : undefined;
  if (mergeReceiptPath) {
    const pullRequest = process.env.MERGED_PULL_REQUEST_URL;
    const approvers = String(process.env.HUMAN_APPROVERS ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    if (!pullRequest || !approvers.length) throw new Error('A main-branch merge receipt requires an evidenced pull request URL and named human approvers.');
    const runUrl = source.startsWith('http') ? source : `https://github.com/${repository}/actions/runs/${runId}`;
    const ciEvidence = Object.entries(upstreamResults)
      .filter(([, upstream]) => upstream.result === 'success')
      .map(([upstreamJobId]) => ({
        workflow,
        job: upstreamJobId,
        runId,
        headSha: sha,
        conclusion: 'success',
        testIdentities: parsed.filter((item) => item.producerJob === upstreamJobId).map((item) => `${item.framework}:${normalizeFile(item.file, root)}#${item.title}`),
      }));
    writeJson(mergeReceiptPath, {
      schemaVersion: '1.0.0',
      receiptId: `merge:${sha}`,
      pullRequest,
      mergeSha: sha,
      mergedAt: timestamp,
      approvers,
      ciEvidence,
      artifactDigest: `sha256:${stableHash(JSON.stringify({ sha, runId, parsed: parsed.length, matched }), 64)}`,
      supersedes: [],
      invalidates: [],
    });
  }
  fs.writeFileSync(path.join(artifactDir, 'coverage-report.md'), `# Current-SHA CI evidence\n\n- Workflow: ${workflow}\n- Run: ${runId}\n- Head SHA: \`${sha}\`\n- Named passing results: ${parsed.length}\n- Matched ontology test nodes: ${matched}\n- Unmatched named results retained as result subjects: ${parsed.length - matched}\n- Machine ledger: \`evidence-ledger.json\`\n- Semantic graph diff: \`graph-diff.json\`\n`);
  return { parsed: parsed.length, matched, artifactDir };
}

export function proveCoverage(root, inputs, options = {}) {
  const files = [...new Set(inputs.flatMap((input) => walkJson(path.resolve(root, input))))];
  if (!files.length) throw new Error(`No machine-readable test result JSON found under: ${inputs.join(', ')}`);
  const parsed = [];
  for (const file of files) {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    parsed.push(...vitestResults(value, file), ...playwrightResults(value, file));
  }
  const coverageMap = readJson(path.join(root, 'ontology', 'coverage-map.json'));
  const nodeSnapshot = readJson(path.join(root, 'ontology', 'nodes.json'));
  const testNodes = nodeSnapshot.nodes.filter((node) => node.type === 'Test');
  const matches = parsed
    .map((result) => ({ result, node: matchNode(result, testNodes, root) }))
    .filter((item) => item.node);
  const localDirty = !options.sha && !process.env.GITHUB_SHA && worktreeDirty(root);
  const sha = options.sha ?? process.env.GITHUB_SHA ?? (localDirty ? 'WORKTREE' : git(root, ['rev-parse', 'HEAD']));
  const runId = options.runId ?? process.env.GITHUB_RUN_ID ?? 'local';
  const jobId = options.jobId ?? process.env.GITHUB_JOB ?? 'local-proof';
  const groups = [...coverageMap.lifecycle, ...coverageMap.invariants].map((group) => {
    const id = group.stage ?? group.id;
    const proving = matches.filter(({ node }) => group.testTitleIncludes.some((needle) => node.name.toLowerCase().includes(needle.toLowerCase())));
    return {
      id,
      status: proving.length ? 'PROVEN' : 'BLOCKED',
      headSha: sha,
      runId,
      jobId,
      provingTests: proving.map(({ result, node }) => ({ nodeId: node.id, title: node.name, file: node.path, framework: result.framework })),
    };
  });
  return {
    schemaVersion: '1.0.0',
    headSha: sha,
    evidenceTier: process.env.GITHUB_SHA ? 'E1' : 'E3',
    sourceState: sha === 'WORKTREE' ? 'DIRTY_WORKTREE' : 'COMMIT_BOUND',
    runId,
    jobId,
    generatedAt: new Date().toISOString(),
    namedPassingResults: parsed.length,
    matchedOntologyTests: matches.length,
    groups,
  };
}
