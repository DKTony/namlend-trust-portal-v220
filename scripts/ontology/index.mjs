#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  activeFiles,
  git,
  readJson,
  semanticSnapshot,
  writeJson,
} from './model.mjs';
import {
  addCoverageAndGaps,
  createBaseGraph,
  extractCiDocumentsDeployments,
  extractComponentsAndRoutes,
  extractConvexFunctions,
  extractExternalSystems,
  extractFeaturesPlansFlagsRoles,
  extractHttpAndSchedules,
  extractionMetrics,
  extractSchema,
  extractTests,
  extractAgentHarness,
  governSkips,
  ingestNotionAndCiEvidence,
} from './extractors.mjs';
import { writeReports } from './reports.mjs';
import { ingestResults, proveCoverage } from './result-ingest.mjs';

const root = process.cwd();
const ontologyDir = path.join(root, 'ontology');
const command = process.argv[2] ?? 'extract';
const args = process.argv.slice(3);

function buildGraph({ bootstrapSkips = false, commitShaOverride } = {}) {
  const manifest = readJson(path.join(ontologyDir, 'source-manifest.json'));
  const coverageMap = readJson(path.join(ontologyDir, 'coverage-map.json'));
  if (!manifest || !coverageMap) throw new Error('Missing ontology/source-manifest.json or ontology/coverage-map.json');
  const commitSha = commitShaOverride ?? git(root, ['rev-parse', 'HEAD'], manifest.repository.baselineCommitSha);
  const graph = createBaseGraph({ root, commitSha, extractedAt: new Date().toISOString(), manifest });
  const files = activeFiles(root);
  const schemaMetrics = extractSchema(graph, root);
  const featureData = extractFeaturesPlansFlagsRoles(graph, root, files);
  extractExternalSystems(graph);
  extractConvexFunctions(graph, root, files);
  const componentData = extractComponentsAndRoutes(graph, root, files);
  extractHttpAndSchedules(graph, root);
  const testData = extractTests(graph, root, files, componentData);
  governSkips(graph, root, testData.skipSites, bootstrapSkips);
  extractCiDocumentsDeployments(graph, root, files, manifest);
  extractAgentHarness(graph, root);
  const metrics = extractionMetrics(graph, schemaMetrics, featureData, root);
  ingestNotionAndCiEvidence(graph, manifest, metrics);
  addCoverageAndGaps(graph, coverageMap);
  const referenceErrors = graph.validateReferences();
  if (referenceErrors.length) throw new Error(`Graph reference errors:\n${referenceErrors.join('\n')}`);
  return { graph, metrics };
}

function writeSnapshot(graph, metrics) {
  fs.mkdirSync(ontologyDir, { recursive: true });
  const snapshots = graph.snapshots();
  writeJson(path.join(ontologyDir, 'nodes.json'), snapshots.nodes);
  writeJson(path.join(ontologyDir, 'edges.json'), snapshots.edges);
  writeJson(path.join(ontologyDir, 'evidence-ledger.json'), snapshots.ledger);
  writeJson(path.join(ontologyDir, 'metrics.json'), {
    schemaVersion: '1.0.0',
    commitSha: graph.commitSha,
    extractedAt: graph.extractedAt,
    ...metrics,
    gapCount: graph.gaps.size,
    conflictCount: graph.conflicts.size,
  });
  writeJson(path.join(ontologyDir, 'gaps.json'), {
    schemaVersion: '1.0.0', commitSha: graph.commitSha, extractedAt: graph.extractedAt,
    gaps: [...graph.gaps.values()].sort((a, b) => a.id.localeCompare(b.id)),
  });
  writeJson(path.join(ontologyDir, 'conflicts.json'), {
    schemaVersion: '1.0.0', commitSha: graph.commitSha, extractedAt: graph.extractedAt,
    conflicts: [...graph.conflicts.values()].sort((a, b) => a.id.localeCompare(b.id)),
  });
  writeReports(root, graph, metrics);
}

function semanticEqual(left, right) {
  return JSON.stringify(semanticSnapshot(left)) === JSON.stringify(semanticSnapshot(right));
}

function checkSnapshot() {
  const committed = readJson(path.join(ontologyDir, 'nodes.json'));
  const { graph, metrics } = buildGraph({ commitShaOverride: committed?.commitSha });
  const snapshots = graph.snapshots();
  const expected = {
    'nodes.json': snapshots.nodes,
    'edges.json': snapshots.edges,
    'evidence-ledger.json': snapshots.ledger,
  };
  const stale = [];
  for (const [name, value] of Object.entries(expected)) {
    const current = readJson(path.join(ontologyDir, name));
    if (!current || !semanticEqual(current, value)) stale.push(name);
  }
  const fatalGaps = [...graph.gaps.values()].filter((gap) =>
    ['UNREGISTERED_TEST_SKIP', 'STALE_SKIP_EXCEPTION'].includes(gap.kind)
  );
  const baseline = readJson(path.join(ontologyDir, 'debt-baseline.json'));
  const baselineByKind = new Map((baseline?.gaps ?? []).map((entry) => [entry.kind, entry]));
  const currentByKind = new Map();
  for (const gap of graph.gaps.values()) currentByKind.set(gap.kind, (currentByKind.get(gap.kind) ?? 0) + 1);
  const ratchetFailures = [];
  if (!baseline) {
    ratchetFailures.push('Missing ontology/debt-baseline.json.');
  } else {
    for (const gap of graph.gaps.values()) {
      const registered = baselineByKind.get(gap.kind);
      if (!registered) ratchetFailures.push(`New unregistered gap kind ${gap.kind} (${gap.id}).`);
      if (Date.parse(gap.reviewDate) < Date.parse(graph.extractedAt)) ratchetFailures.push(`${gap.id} has an expired review date.`);
    }
    for (const [kind, count] of currentByKind) {
      const limit = baselineByKind.get(kind)?.maximumCount;
      if (Number.isInteger(limit) && count > limit) ratchetFailures.push(`${kind} increased from baseline ${limit} to ${count}.`);
    }
  }
  if (stale.length || fatalGaps.length || ratchetFailures.length) {
    const messages = [];
    if (stale.length) messages.push(`Generated ontology is stale: ${stale.join(', ')}. Run npm run ontology:extract.`);
    if (fatalGaps.length) messages.push(`Skip governance failures: ${fatalGaps.map((gap) => gap.id).join(', ')}.`);
    if (ratchetFailures.length) messages.push(`Ontology debt ratchet failures:\n${ratchetFailures.join('\n')}`);
    throw new Error(messages.join('\n'));
  }
  process.stdout.write(`Ontology check passed: ${metrics.effectiveTableCount} tables, ${metrics.effectiveIndexCount} indexes, ${graph.nodes.size} nodes, ${graph.edges.size} edges.\n`);
}

function impact(nodeId) {
  const nodes = readJson(path.join(ontologyDir, 'nodes.json'))?.nodes ?? [];
  const edges = readJson(path.join(ontologyDir, 'edges.json'))?.edges ?? [];
  if (!nodes.some((node) => node.id === nodeId)) throw new Error(`Unknown ontology node: ${nodeId}`);
  const reverse = new Map();
  for (const edge of edges) {
    if (edge.attributes?.structural || ['CONTAINS', 'DOCUMENTED_IN', 'DEPLOYED_BY', 'TESTED_BY'].includes(edge.type)) continue;
    if (!reverse.has(edge.to)) reverse.set(edge.to, []);
    reverse.get(edge.to).push(edge);
  }
  for (const [target, incoming] of reverse) {
    reverse.set(target, [...new Map(incoming.map((edge) => [edge.from, edge])).values()]);
  }
  const results = [];
  const queue = (reverse.get(nodeId) ?? []).map((edge) => ({ current: edge.from, path: [edge] }));
  const visited = new Set();
  while (queue.length) {
    const item = queue.shift();
    if (visited.has(item.current) || item.current === nodeId) continue;
    visited.add(item.current);
    results.push(item);
    for (const edge of reverse.get(item.current) ?? []) queue.push({ current: edge.from, path: [...item.path, edge] });
  }
  process.stdout.write(`Impact for ${nodeId}\n`);
  process.stdout.write(`Direct dependents: ${(reverse.get(nodeId) ?? []).map((edge) => edge.from).join(', ') || '(none)'}\n`);
  process.stdout.write(`Transitive dependents: ${results.length}\n`);
  for (const result of results) {
    const chain = [nodeId];
    for (const edge of result.path) chain.unshift(`${edge.from} -[${edge.type}]->`);
    process.stdout.write(`depth=${result.path.length} ${result.current}: ${chain.join(' ')}; evidence=${result.path.flatMap((edge) => edge.evidenceRefs).join(',')}\n`);
  }
}

function gitJson(ref, file) {
  const raw = git(root, ['show', `${ref}:${file}`], '');
  return raw ? JSON.parse(raw) : undefined;
}

function diff(baseSha) {
  if (!baseSha) throw new Error('Usage: npm run ontology:diff -- <base-sha>');
  for (const [file, key] of [['ontology/nodes.json', 'nodes'], ['ontology/edges.json', 'edges']]) {
    const before = gitJson(baseSha, file)?.[key] ?? [];
    const after = readJson(path.join(root, file))?.[key] ?? [];
    const beforeById = new Map(before.map((item) => [item.id, item]));
    const afterById = new Map(after.map((item) => [item.id, item]));
    const added = [...afterById.keys()].filter((id) => !beforeById.has(id)).sort();
    const removed = [...beforeById.keys()].filter((id) => !afterById.has(id)).sort();
    const changed = [...afterById.keys()].filter((id) => beforeById.has(id) && !semanticEqual(afterById.get(id), beforeById.get(id))).sort();
    process.stdout.write(`${key}: +${added.length} -${removed.length} ~${changed.length}\n`);
    for (const id of added) process.stdout.write(`  + ${id}\n`);
    for (const id of removed) process.stdout.write(`  - ${id}\n`);
    for (const id of changed) process.stdout.write(`  ~ ${id}\n`);
  }
}

try {
  if (command === 'extract') {
    const { graph, metrics } = buildGraph({ bootstrapSkips: args.includes('--bootstrap-skips') });
    writeSnapshot(graph, metrics);
    process.stdout.write(`Generated ${graph.nodes.size} nodes and ${graph.edges.size} edges at ${graph.commitSha}.\n`);
  } else if (command === 'check') {
    checkSnapshot();
  } else if (command === 'impact') {
    impact(args[0]);
  } else if (command === 'diff') {
    diff(args[0]);
  } else if (command === 'ingest-results') {
    const result = ingestResults(root, args.length ? args : ['test-results']);
    process.stdout.write(`Ingested ${result.parsed} passing named results; ${result.matched} matched ontology test nodes.\n`);
  } else if (command === 'prove-results') {
    const output = args[0] === '--out' ? args[1] : 'test-results/ontology-execution-proof.json';
    const inputs = args[0] === '--out' ? args.slice(2) : args;
    const result = proveCoverage(root, inputs.length ? inputs : ['test-results']);
    writeJson(path.resolve(root, output), result);
    const blocked = result.groups.filter((group) => group.status !== 'PROVEN');
    process.stdout.write(`Execution proof mapped ${result.matchedOntologyTests} named passing results across ${result.groups.length} behaviours.\n`);
    if (blocked.length) throw new Error(`Unproven behaviours: ${blocked.map((group) => group.id).join(', ')}`);
  } else {
    throw new Error(`Unknown ontology command: ${command}`);
  }
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
}
