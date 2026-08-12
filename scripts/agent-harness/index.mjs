#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  HARNESS_DIR,
  ROOT,
  changedPaths,
  digestFile,
  git,
  impactPaths,
  printJson,
  readJson,
  scanForSensitiveReceiptData,
  schemaValidator,
  validateChangedPaths,
  validateExceptions,
  validateTaskPolicy,
} from './lib.mjs';

const command = process.argv[2] ?? 'preflight';
const args = process.argv.slice(3).filter((arg) => arg !== '--');
const policy = readJson(path.join(HARNESS_DIR, 'policy.json'));

function loadTask(file) {
  if (!file) throw new Error('A task-contract JSON path is required.');
  const absolute = path.resolve(ROOT, file);
  return { absolute, task: schemaValidator('task-contract.schema.json')(readJson(absolute), file) };
}

function preflight(file) {
  const errors = [];
  const headSha = git(['rev-parse', 'HEAD']);
  const runtime = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (process.version !== `v${runtime.engines.node}`) errors.push(`Node ${runtime.engines.node} is required; current is ${process.version}.`);
  if (!fs.existsSync(path.join(ROOT, 'ontology', 'nodes.json'))) errors.push('Authoritative ontology is missing.');
  errors.push(...validateExceptions(policy));
  let task;
  if (file) {
    task = loadTask(file).task;
    if (task.baseSha !== headSha) errors.push(`Task baseSha ${task.baseSha} does not equal HEAD ${headSha}.`);
    errors.push(...validateTaskPolicy(task, policy).map((violation) => `${violation.code}: ${violation.message}`));
  }
  const result = { schemaVersion: '1.0.0', ok: errors.length === 0, headSha, taskId: task?.taskId ?? null, errors };
  printJson(result);
  if (errors.length) process.exitCode = 1;
}

function context(file) {
  const { task } = loadTask(file);
  const taskErrors = validateTaskPolicy(task, policy);
  if (taskErrors.length) throw new Error(taskErrors.map((item) => `${item.code}: ${item.message}`).join('\n'));
  const nodeSnapshot = readJson(path.join(ROOT, 'ontology', 'nodes.json'));
  const edgeSnapshot = readJson(path.join(ROOT, 'ontology', 'edges.json'));
  const gaps = readJson(path.join(ROOT, 'ontology', 'gaps.json')).gaps;
  const conflicts = readJson(path.join(ROOT, 'ontology', 'conflicts.json')).conflicts;
  const nodes = new Map(nodeSnapshot.nodes.map((node) => [node.id, node]));
  const affected = task.affectedOntologyIds.map((id) => nodes.get(id)).filter(Boolean);
  const paths = task.affectedOntologyIds.flatMap((id) => impactPaths(id, nodes, edgeSnapshot.edges).map((result) => ({ sourceId: id, ...result })));
  const impactedIds = new Set([...task.affectedOntologyIds, ...paths.map((item) => item.targetId)]);
  const relevantTests = nodeSnapshot.nodes.filter((node) => node.type === 'Test' && edgeSnapshot.edges.some((edge) => edge.type === 'TESTED_BY' && impactedIds.has(edge.from) && edge.to === node.id));
  const evidenceIds = new Set(affected.flatMap((node) => node.evidenceRefs));
  const packet = {
    schemaVersion: '1.0.0',
    taskId: task.taskId,
    sourceSha: nodeSnapshot.commitSha,
    generatedAt: new Date().toISOString(),
    ontologyHash: digestFile(path.join(ROOT, 'ontology', 'nodes.json')),
    graphifyHash: fs.existsSync(path.join(ROOT, '.cache', 'graphify', 'current', 'graphify-out', 'graph.json'))
      ? digestFile(path.join(ROOT, '.cache', 'graphify', 'current', 'graphify-out', 'graph.json'))
      : null,
    affectedNodes: affected,
    impactPaths: paths,
    relevantTests,
    owners: [task.owner, policy.defaultOwner],
    conflicts: conflicts.filter((item) => impactedIds.has(item.subjectId)),
    gaps: gaps.filter((item) => impactedIds.has(item.subjectId)),
    citations: affected.flatMap((node) => node.evidenceRefs.map((evidenceRef) => ({ nodeId: node.id, evidenceRef }))).filter((item) => evidenceIds.has(item.evidenceRef)),
  };
  schemaValidator('context-packet.schema.json')(packet, 'generated context packet');
  printJson(packet);
}

function verify(file) {
  if (!file) throw new Error('An agent-run receipt JSON path is required.');
  const receipt = schemaValidator('agent-run-receipt.schema.json')(readJson(path.resolve(ROOT, file)), file);
  const { task } = loadTask(receipt.taskContract);
  const violations = [
    ...validateTaskPolicy(task, policy),
    ...validateChangedPaths(task, policy, receipt.changedPaths),
    ...scanForSensitiveReceiptData(receipt).map((pattern) => ({ severity: 'hard', code: 'SENSITIVE_RECEIPT_DATA', message: `Receipt matched ${pattern}.` })),
  ];
  if (receipt.taskId !== task.taskId || receipt.baseSha !== task.baseSha) {
    violations.push({ severity: 'hard', code: 'RECEIPT_TASK_MISMATCH', message: 'Receipt does not match its task contract.' });
  }
  if (Date.parse(receipt.completedAt) - Date.parse(receipt.startedAt) > policy.maxRunMinutes * 60_000) {
    violations.push({ severity: 'hard', code: 'RUN_TIMEOUT', message: 'Run exceeded the policy duration.' });
  }
  if (receipt.commands.some((item) => item.exitCode !== 0)) {
    violations.push({ severity: 'hard', code: 'FAILED_ACCEPTANCE_COMMAND', message: 'At least one recorded command failed.' });
  }
  const actual = changedPaths(receipt.baseSha);
  if (JSON.stringify(actual) !== JSON.stringify([...receipt.changedPaths].sort())) {
    violations.push({ severity: 'hard', code: 'RECEIPT_DIFF_MISMATCH', message: 'Receipt changedPaths does not match the repository diff.', actual });
  }
  printJson({ schemaVersion: '1.0.0', ok: violations.length === 0, runId: receipt.runId, taskId: receipt.taskId, violations });
  if (violations.length) process.exitCode = 1;
}

function policyCheck() {
  const errors = validateExceptions(policy);
  const securityFindings = readJson(path.join(HARNESS_DIR, 'security-findings.json')).findings;
  const gaps = readJson(path.join(ROOT, 'ontology', 'gaps.json')).gaps;
  const hard = gaps.filter((gap) => policy.hardGapKinds.includes(gap.kind));
  for (const gap of hard) errors.push(`${gap.id} is an unwaivable hard safety gap (${gap.kind}).`);
  for (const finding of securityFindings) {
    if (!policy.hardGapKinds.includes(finding.category)) errors.push(`${finding.id}: security category ${finding.category} is not registered as hard.`);
    if (Date.parse(finding.reviewDate) < Date.now()) errors.push(`${finding.id}: blocked security finding review date has expired.`);
    if (finding.status === 'BLOCKED') errors.push(`${finding.id}: ${finding.blockingCondition}`);
  }
  const trackedFiles = [...new Set([
    ...git(['ls-files']).split('\n').filter(Boolean),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean),
  ])].sort();
  const secretPatterns = [
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /(?:^|[^A-Za-z0-9_])sk-[A-Za-z0-9_-]{20,}/,
  ];
  for (const relative of trackedFiles) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile() || fs.statSync(absolute).size > 5_000_000) continue;
    const contents = fs.readFileSync(absolute, 'utf8');
    if (secretPatterns.some((pattern) => pattern.test(contents))) errors.push(`${relative}: tracked source matches a prohibited credential pattern.`);
  }
  const activeInstructions = ['AGENTS.md', 'CLAUDE.MD', 'CONTRIBUTING.md', 'WORKFLOW.md', 'convex/AGENTS.md'];
  const contradictoryGuidance = [
    { pattern: /there is no working typecheck gate/i, message: 'Typecheck guidance contradicts the tsc -b release gate.' },
    { pattern: /new (?:backend )?(?:logic|features?) (?:goes?|belongs?|should go) (?:in|to) (?:supabase|src\/services)/i, message: 'New backend work must target Convex.' },
    { pattern: /supabase.{0,40}(?:is|as) the (?:active |primary )?(?:backend|source of truth)/i, message: 'Supabase-first guidance contradicts the active Convex architecture.' },
  ];
  for (const relative of activeInstructions) {
    const contents = fs.readFileSync(path.join(ROOT, relative), 'utf8');
    for (const rule of contradictoryGuidance) {
      if (rule.pattern.test(contents)) errors.push(`${relative}: ${rule.message}`);
    }
  }
  for (const workflow of fs.readdirSync(path.join(ROOT, '.github', 'workflows')).filter((name) => name.endsWith('.yml'))) {
    const relative = `.github/workflows/${workflow}`;
    const contents = fs.readFileSync(path.join(ROOT, relative), 'utf8');
    if (!/^permissions:\s*$/m.test(contents)) errors.push(`${relative}: workflow must declare explicit least-privilege permissions.`);
    for (const match of contents.matchAll(/uses:\s*[^\s@]+@([^\s#]+)/g)) {
      if (!/^[a-f0-9]{40}$/.test(match[1])) errors.push(`${relative}: action reference ${match[0]} is not pinned to a full commit SHA.`);
    }
  }
  printJson({ schemaVersion: '1.0.0', ok: errors.length === 0, hardGapCount: hard.length, blockedSecurityFindings: securityFindings.filter((item) => item.status === 'BLOCKED').map((item) => item.id), errors });
  if (errors.length) process.exitCode = 1;
}

function validateMergeReceipt(file) {
  if (!file) throw new Error('A merge-receipt JSON path is required.');
  const receipt = schemaValidator('merge-receipt.schema.json')(readJson(path.resolve(ROOT, file)), file);
  const sensitive = scanForSensitiveReceiptData(receipt);
  if (sensitive.length) throw new Error(`Merge receipt contains disallowed sensitive material: ${sensitive.join(', ')}`);
  printJson({ schemaVersion: '1.0.0', ok: true, receiptId: receipt.receiptId, mergeSha: receipt.mergeSha });
}

function evaluate() {
  const dataset = readJson(path.join(HARNESS_DIR, 'evals', 'dataset.json'));
  const nodeSnapshot = readJson(path.join(ROOT, 'ontology', 'nodes.json'));
  const edgeSnapshot = readJson(path.join(ROOT, 'ontology', 'edges.json'));
  const nodes = new Map(nodeSnapshot.nodes.map((node) => [node.id, node]));
  const results = dataset.retrieval.map((item) => {
    const found = item.expectedNodeIds.filter((id) => nodes.has(id));
    const exactPaths = item.expectedImpactTargets
      ? impactPaths(item.sourceNodeId, nodes, edgeSnapshot.edges).filter((pathResult) => item.expectedImpactTargets.includes(pathResult.targetId))
      : [];
    return { id: item.id, expected: item.expectedNodeIds.length, found: found.length, impactTargetsFound: exactPaths.length, pass: found.length === item.expectedNodeIds.length && (!item.expectedImpactTargets || exactPaths.length === item.expectedImpactTargets.length) };
  });
  const policies = dataset.policyCases.map((item) => {
    const task = { ...item.task, baseSha: git(['rev-parse', 'HEAD']), expiresAt: '2099-01-01T00:00:00.000Z' };
    const violations = validateTaskPolicy(task, policy);
    const codes = new Set(violations.map((violation) => violation.code));
    return { id: item.id, pass: item.expectedViolationCodes.every((code) => codes.has(code)), violations };
  });
  const all = [...results, ...policies];
  const composition = Object.fromEntries(['exact-impact', 'evidence-proof', 'exploratory'].map((kind) => [kind, dataset.retrieval.filter((item) => item.kind === kind).length]));
  const blueprintComposition = Object.fromEntries(Object.entries(dataset.codingTaskBlueprints).map(([kind, values]) => [kind, values.length]));
  const corpusValid = Object.values(composition).every((count) => count === 10)
    && ['typical', 'edge', 'adversarial'].every((kind) => blueprintComposition[kind] === 8);
  const graphifyResultsPath = path.join(HARNESS_DIR, 'evals', 'results', 'graphify-current.json');
  const graphifyEvaluation = fs.existsSync(graphifyResultsPath)
    ? readJson(graphifyResultsPath)
    : { status: 'NOT_EVALUATED', enabledForDecisionSupport: false, reason: 'No current source-filtered Graphify retrieval benchmark is registered.' };
  const report = {
    schemaVersion: '1.0.0', datasetVersion: dataset.schemaVersion, total: all.length,
    passed: all.filter((item) => item.pass).length, results, policies, composition,
    blueprintComposition, corpusValid, graphifyEvaluation, promotionEligible: false,
  };
  printJson(report);
  if (report.passed !== report.total || !corpusValid) process.exitCode = 1;
}

try {
  if (command === 'preflight') preflight(args[0]);
  else if (command === 'context') context(args[0]);
  else if (command === 'verify') verify(args[0]);
  else if (command === 'policy') policyCheck();
  else if (command === 'eval') evaluate();
  else if (command === 'validate-merge') validateMergeReceipt(args[0]);
  else throw new Error(`Unknown agent harness command: ${command}`);
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
}
