#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { readRegularFileWithinRoot } from '../safe-files.mjs';

const root = process.cwd();
const command = process.argv[2] ?? 'check';
const args = process.argv.slice(3).filter((arg) => arg !== '--');
const toolDir = path.join(root, 'tools', 'graphify');
const cacheRoot = path.join(root, '.cache', 'graphify');
const forbiddenPrefixes = [
  'namlend-mobile/', 'supabase/', 'ontology/', 'scripts/ontology/', 'agent-harness/evals/results/',
  'node_modules/', 'dist/', '.git/', '.cache/', 'test-results/', 'playwright-report/'
];
const forbiddenNames = new Set(['.env', '.env.local', '.env.production', '.env.e2e']);
const allowedRoots = ['src/', 'convex/', 'e2e/', '.github/workflows/'];
const allowedRootFiles = new Set([
  'AGENTS.md', 'CLAUDE.MD', 'CONTRIBUTING.md', 'WORKFLOW.md', 'package.json', 'netlify.toml',
  'vite.config.ts', 'vitest.config.ts', 'vitest.convex.config.ts', 'vitest.ontology.config.ts',
  'playwright.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
  'scripts/safe-files.mjs'
]);

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return fallback;
  }
}

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function trackedAllowlist() {
  const files = git(['ls-files', '--stage'])
    .split('\n')
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(\d{6}) [0-9a-f]+ \d\t(.+)$/);
      if (!match) throw new Error(`Unable to parse tracked file entry: ${entry}`);
      return { mode: match[1], file: match[2].replaceAll('\\', '/') };
    })
    .filter(({ mode }) => mode === '100644' || mode === '100755')
    .map(({ file }) => file);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'ontology', 'source-manifest.json'), 'utf8'));
  const activeDocuments = new Set(manifest.activeDocuments ?? []);
  return files.filter((file) => {
    if (forbiddenNames.has(path.posix.basename(file)) || /(^|\/)\.env(?:\.|$)/.test(file)) return false;
    if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) return false;
    if (file.includes('/_generated/')) return false;
    if (file.startsWith('docs/')) return activeDocuments.has(file);
    return activeDocuments.has(file) || allowedRootFiles.has(file) || allowedRoots.some((prefix) => file.startsWith(prefix));
  }).sort();
}

function findUv() {
  const override = process.env.NAMLEND_UV_BIN;
  const candidates = [override, 'uv'].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) return candidate;
  }
  throw new Error('uv is required for the pinned Graphify environment. Install uv or set NAMLEND_UV_BIN.');
}

function runGraphify(graphifyArgs, options = {}) {
  const sandboxHome = path.join(cacheRoot, '.sandbox-home');
  fs.mkdirSync(sandboxHome, { recursive: true });
  const localGraphify = path.join(toolDir, '.venv', 'bin', 'graphify');
  const localVersion = fs.existsSync(localGraphify)
    ? spawnSync(localGraphify, ['--version'], { encoding: 'utf8' })
    : undefined;
  const useLockedEnvironment = localVersion?.status === 0 && /graphify 0\.9\.40\b/.test(localVersion.stdout);
  const executable = useLockedEnvironment ? localGraphify : findUv();
  const commandArgs = useLockedEnvironment
    ? graphifyArgs
    : ['run', '--frozen', '--project', toolDir, 'graphify', ...graphifyArgs];
  const result = spawnSync(executable, commandArgs, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: {
      PATH: process.env.PATH,
      // Do not expose the user's home, SSH configuration, or provider config to
      // the discovery process. The ignored cache home contains no credentials.
      HOME: sandboxHome,
      TMPDIR: process.env.TMPDIR,
      UV_CACHE_DIR: process.env.UV_CACHE_DIR,
      GRAPHIFY_QUERY_LOG_DISABLE: '1',
      GRAPHIFY_QUERY_LOG_ENABLE: '',
      GRAPHIFY_QUERY_LOG: '',
      OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '', GEMINI_API_KEY: '',
      DEEPSEEK_API_KEY: '', MOONSHOT_API_KEY: '', KIMI_API_KEY: '', AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '',
    },
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Graphify exited ${result.status}`);
  return result.stdout ?? '';
}

function copyCorpus(files, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) {
    const contents = readRegularFileWithinRoot(root, file);
    if (contents === undefined) throw new Error(`Allowlisted source is missing or unsafe: ${file}`);
    const destination = path.join(target, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, contents);
  }
}

function sourceManifestHash(files) {
  return digest(
    files
      .map((file) => {
        const contents = readRegularFileWithinRoot(root, file);
        if (contents === undefined) throw new Error(`Allowlisted source is missing or unsafe: ${file}`);
        return `${file}:${digest(contents)}`;
      })
      .join('\n')
  );
}

function validateGraph(graphFile, allowed) {
  const graph = JSON.parse(fs.readFileSync(graphFile, 'utf8'));
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error('Graphify output has no nodes/edges arrays.');
  const allowedSet = new Set(allowed);
  const corpusFiles = graph.nodes
    .filter((node) => node.source_location)
    .map((node) => String(node.source_file ?? '').replaceAll('\\', '/').replace(/^\.\//, ''))
    .filter(Boolean);
  const leaked = corpusFiles.filter((file) => !allowedSet.has(file));
  if (leaked.length) throw new Error(`Graphify included files outside the active allowlist: ${[...new Set(leaked)].slice(0, 20).join(', ')}`);
  const excludedSurface = graph.nodes
    .map((node) => String(node.source_file ?? '').replaceAll('\\', '/').replace(/^\.\//, ''))
    .filter((file) => path.isAbsolute(file) || file.includes('../') || forbiddenPrefixes.some((prefix) => file.startsWith(prefix)) || /(^|\/)\.env(?:\.|$)/.test(file));
  if (excludedSurface.length) throw new Error(`Graphify referenced an explicitly excluded surface: ${[...new Set(excludedSurface)].slice(0, 20).join(', ')}`);
  const invalidConfidence = graph.edges.filter((edge) => !['EXTRACTED', 'INFERRED', 'AMBIGUOUS'].includes(edge.confidence));
  if (invalidConfidence.length) throw new Error(`Graphify emitted ${invalidConfidence.length} unregistered confidence values.`);
  return { graph, leaked: 0 };
}

function check({ validateCurrent = true } = {}) {
  const pyproject = fs.readFileSync(path.join(toolDir, 'pyproject.toml'), 'utf8');
  const lock = fs.readFileSync(path.join(toolDir, 'uv.lock'), 'utf8');
  if (!pyproject.includes('graphifyy==0.9.40') || !lock.includes('name = "graphifyy"\nversion = "0.9.40"')) {
    throw new Error('Graphify must remain pinned to 0.9.40 in both pyproject.toml and uv.lock.');
  }
  for (const forbidden of ['graphify install', 'hook install', 'save-result', 'reflect', '--global']) {
    if (fs.readFileSync(import.meta.filename, 'utf8').includes(`runGraphify(['${forbidden}`)) throw new Error(`Forbidden Graphify capability wired: ${forbidden}`);
  }
  const current = path.join(cacheRoot, 'current', 'graphify-out', 'graph.json');
  if (validateCurrent && fs.existsSync(current)) {
    const allowed = trackedAllowlist();
    validateGraph(current, allowed);
    const metadataFile = path.join(cacheRoot, 'current', 'namlend-sidecar.json');
    if (!fs.existsSync(metadataFile)) throw new Error('Graphify cache is missing NamLend sidecar metadata. Regenerate it.');
    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    const expectedHash = `sha256:${sourceManifestHash(allowed)}`;
    if (metadata.sourceSha !== git(['rev-parse', 'HEAD']) || metadata.sourceManifestHash !== expectedHash) {
      throw new Error('Graphify cache is stale for the current source SHA or active-file digest. Run npm run graphify:extract.');
    }
    if (metadata.toolVersion !== '0.9.40' || metadata.authoritative !== false || metadata.codeOnly !== true) {
      throw new Error('Graphify cache metadata violates the discovery-only contract.');
    }
  }
  process.stdout.write(`Graphify sidecar policy passed; ${trackedAllowlist().length} tracked active files are eligible.\n`);
}

function extract() {
  // A manifest change intentionally invalidates the previous cache. Validate
  // the pinned tool policy first, then validate the replacement graph below.
  check({ validateCurrent: false });
  const allowed = trackedAllowlist();
  const headSha = git(['rev-parse', 'HEAD']);
  const manifestHash = sourceManifestHash(allowed);
  const cacheKey = `${headSha}-${manifestHash.slice(0, 16)}-graphify-0.9.40`;
  const target = path.join(cacheRoot, cacheKey);
  const graphFile = path.join(target, 'graphify-out', 'graph.json');
  if (!fs.existsSync(graphFile)) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'namlend-graphify-'));
    try {
      const corpus = path.join(temp, 'corpus');
      copyCorpus(allowed, corpus);
      runGraphify(['extract', '.', '--code-only', '--no-cluster', '--out', target, '--max-workers', '2'], { cwd: corpus });
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
  const { graph } = validateGraph(graphFile, allowed);
  fs.mkdirSync(cacheRoot, { recursive: true });
  const current = path.join(cacheRoot, 'current');
  fs.rmSync(current, { recursive: true, force: true });
  fs.cpSync(target, current, { recursive: true });
  fs.writeFileSync(path.join(current, 'namlend-sidecar.json'), `${JSON.stringify({
    schemaVersion: '1.0.0', authoritative: false, tool: 'graphifyy', toolVersion: '0.9.40',
    sourceSha: headSha, sourceManifestHash: `sha256:${manifestHash}`, codeOnly: true, directedInterpretation: true,
    nodeCount: graph.nodes.length, edgeCount: graph.edges.length, generatedAt: new Date().toISOString()
  }, null, 2)}\n`);
  process.stdout.write(`Graphify discovery cache: ${graph.nodes.length} nodes, ${graph.edges.length} directed edges at ${current}.\n`);
}

function query(question) {
  if (!question) throw new Error('Usage: npm run graphify:query -- "question"');
  const graphFile = path.join(cacheRoot, 'current', 'graphify-out', 'graph.json');
  if (!fs.existsSync(graphFile)) throw new Error('No Graphify cache. Run npm run graphify:extract first.');
  validateGraph(graphFile, trackedAllowlist());
  const output = runGraphify(['query', question, '--graph', graphFile, '--budget', '2000'], { capture: true });
  process.stdout.write('DISCOVERY ONLY — verify all decision-driving facts against ontology/source evidence.\n');
  process.stdout.write(output);
}

try {
  if (command === 'check') check();
  else if (command === 'extract') extract();
  else if (command === 'query') query(args.join(' '));
  else throw new Error(`Unknown Graphify sidecar command: ${command}`);
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
}
