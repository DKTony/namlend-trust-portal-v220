import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readRegularFileWithinRoot } from '../safe-files.mjs';

export const SCHEMA_VERSION = '1.0.0';

export const NODE_TYPES = new Set([
  'System',
  'Table',
  'Index',
  'Function',
  'Route',
  'Component',
  'Role',
  'Plan',
  'Feature',
  'Flag',
  'ExternalSystem',
  'Endpoint',
  'Test',
  'CIJob',
  'Deployment',
  'Document',
  'AccessPolicy',
  'Schedule',
  'AgentTask',
  'AgentRun',
  'DecisionRecord',
  'Receipt',
  'Artifact',
]);

export const EDGE_TYPES = new Set([
  'CALLS',
  'READS',
  'WRITES',
  'INDEXES',
  'ROUTES_TO',
  'GATED_BY',
  'ENTITLES',
  'ENFORCED_BY',
  'POSTS_TO',
  'SETTLES_VIA',
  'NOTIFIES_VIA',
  'TESTED_BY',
  'DEPLOYED_BY',
  'DOCUMENTED_IN',
  'DEPENDS_ON',
  'CONTAINS',
  'RENDERS',
  'INVOKES',
  'USES_INDEX',
  'HANDLED_BY',
  'CALLS_ENDPOINT',
  'OWNED_BY',
  'SCHEDULES',
  'PROPOSED_BY',
  'PRODUCED',
  'VERIFIED_BY',
  'APPROVED_BY',
  'SUPERSEDES',
  'INVALIDATES',
]);

export const DEPENDENCY_EDGES = new Set([
  'CALLS',
  'READS',
  'WRITES',
  'ROUTES_TO',
  'GATED_BY',
  'ENTITLES',
  'ENFORCED_BY',
  'POSTS_TO',
  'SETTLES_VIA',
  'NOTIFIES_VIA',
  'DEPENDS_ON',
  'RENDERS',
  'INVOKES',
  'USES_INDEX',
  'HANDLED_BY',
  'CALLS_ENDPOINT',
  'OWNED_BY',
  'SCHEDULES',
  'INDEXES',
  'PROPOSED_BY',
  'PRODUCED',
  'VERIFIED_BY',
  'APPROVED_BY',
  'SUPERSEDES',
  'INVALIDATES',
]);

const TIER_RANK = { NONE: 0, E3: 1, E2: 2, E1: 3, E0: 4 };

export function strongestTier(a, b) {
  return (TIER_RANK[a] ?? 0) >= (TIER_RANK[b] ?? 0) ? a : b;
}

export function stableHash(value, length = 16) {
  return crypto
    .createHash('sha256')
    .update(Buffer.isBuffer(value) ? value : String(value))
    .digest('hex')
    .slice(0, length);
}

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, canonical(item)])
  );
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(canonical(value), null, 2)}\n`);
}

export function readJson(file, fallback = undefined) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

export function git(root, args, fallback = '') {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return fallback;
  }
}

export function trackedFiles(root) {
  return git(root, ['ls-files'], '')
    .split('\n')
    .filter(Boolean)
    .map((file) => file.replaceAll('\\', '/'));
}

export function activeFiles(root) {
  // Build from the declared active surface. Starting with every tracked path
  // would silently re-introduce excluded mobile, Supabase, and generated
  // artifacts before the per-extractor filters run.
  const tracked = new Set();
  const roots = [
    'src',
    'convex',
    'e2e',
    'docs',
    'scripts/ontology',
    '.github/workflows',
    'agent-harness',
    'scripts/agent-harness',
    'scripts/graphify',
    'tools/graphify',
  ];
  const visit = (relative) => {
    const absolute = path.join(root, relative);
    let stat;
    try {
      stat = fs.lstatSync(absolute);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    // The authoritative corpus is repository-local. Never traverse or ingest a
    // symlink, even when its tracked path appears beneath an active root.
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) {
        if (
          [
            'node_modules',
            '_generated',
            '.venv',
            '.cache',
            'dist',
            'test-results',
            'playwright-report',
            'ci-artifact',
          ].includes(name)
        )
          continue;
        visit(path.posix.join(relative, name));
      }
      return;
    }
    tracked.add(relative.replaceAll('\\', '/'));
  };
  for (const relative of roots) visit(relative);
  for (const rootFile of [
    'package.json',
    'netlify.toml',
    'vite.config.ts',
    'AGENTS.md',
    'CLAUDE.MD',
    'CONTRIBUTING.md',
    'WORKFLOW.md',
    '.nvmrc',
    '.npmrc',
    'ontology/ontology.test.ts',
    'scripts/safe-files.mjs',
  ])
    visit(rootFile);
  return [...tracked].sort();
}

export function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

export function cleanComment(value) {
  return String(value ?? '')
    .replace(/^\/\*\*?/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter((line) => line && !line.startsWith('@'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function jsDocText(ts, sourceFile, node) {
  const docs = ts.getJSDocCommentsAndTags(node) ?? [];
  for (const doc of docs) {
    const text = cleanComment(doc.getText(sourceFile));
    if (text) return text.split(/(?<=[.!?])\s/)[0];
  }
  return '';
}

export function humanize(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_./:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function domainFromPath(file) {
  const normalized = String(file).replaceAll('\\', '/').toLowerCase();
  const rules = [
    ['platform', 'platform'],
    ['auth', 'auth'],
    ['kyc', 'kyc'],
    ['loan', 'lending'],
    ['disbursement', 'disbursement'],
    ['payment', 'payments'],
    ['reconciliation', 'reconciliation'],
    ['settlement', 'settlement'],
    ['collection', 'collections'],
    ['mandate', 'mandates'],
    ['notification', 'notifications'],
    ['communication', 'notifications'],
    ['ips', 'ips'],
    ['ipp', 'ips'],
    ['tigerbeetle', 'ledger'],
    ['outbox', 'ledger'],
    ['ontology', 'financial-ontology'],
    ['workflow', 'workflows'],
    ['analytics', 'analytics'],
    ['document', 'documents'],
    ['feature', 'entitlements'],
    ['entitlement', 'entitlements'],
    ['tenan', 'tenancy'],
  ];
  return rules.find(([needle]) => normalized.includes(needle))?.[1] ?? 'shared';
}

export function safeIdPart(value) {
  return String(value)
    .trim()
    .replaceAll('\\', '/')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_./:@#*{}-]/g, '')
    .replace(/-+/g, '-');
}

export class OntologyGraph {
  constructor({ root, commitSha, extractedAt, manifest }) {
    this.root = root;
    this.commitSha = commitSha;
    this.extractedAt = extractedAt;
    this.manifest = manifest;
    this.nodes = new Map();
    this.edges = new Map();
    this.evidence = new Map();
    this.claims = new Map();
    this.gaps = new Map();
    this.conflicts = new Map();
    this.pathDigestCache = new Map();
    this.shaTimestampCache = new Map();
  }

  addEvidence({
    tier = 'E0',
    source,
    path: sourcePath,
    symbol,
    line,
    commitSha,
    status = 'CURRENT',
    ...extra
  }) {
    let pathDigest;
    if (tier === 'E0' && sourcePath) {
      if (!this.pathDigestCache.has(sourcePath)) {
        const contents = readRegularFileWithinRoot(this.root, sourcePath);
        this.pathDigestCache.set(
          sourcePath,
          contents === undefined ? undefined : `sha256:${stableHash(contents, 64)}`
        );
      }
      pathDigest = this.pathDigestCache.get(sourcePath);
    }
    const normalized = {
      tier,
      source,
      path: sourcePath,
      symbol,
      line,
      commitSha: commitSha ?? this.commitSha,
      pathDigest,
      extractedAt: this.extractedAt,
      status,
      ...extra,
    };
    const id = `evidence:${stableHash(JSON.stringify({ ...normalized, extractedAt: undefined }))}`;
    const existing = this.evidence.get(id);
    this.evidence.set(id, { id, ...(existing ?? {}), ...normalized });
    return id;
  }

  addNode(node, evidenceIds = []) {
    if (!NODE_TYPES.has(node.type)) throw new Error(`Unknown node type: ${node.type}`);
    if (!node.id || !node.name || !node.path || !node.purpose) {
      throw new Error(`Incomplete ${node.type} node: ${JSON.stringify(node)}`);
    }
    const refs = [...new Set(evidenceIds.length ? evidenceIds : (node.evidenceRefs ?? []))].sort();
    const tier = refs.reduce(
      (best, id) => strongestTier(best, this.evidence.get(id)?.tier ?? 'NONE'),
      node.evidenceTier ?? 'NONE'
    );
    const current = this.nodes.get(node.id);
    const merged = {
      id: node.id,
      type: node.type,
      name: node.name,
      path: node.path,
      purpose: node.purpose,
      domain: node.domain ?? domainFromPath(node.path),
      evidenceTier: tier,
      evidenceRefs: [...new Set([...(current?.evidenceRefs ?? []), ...refs])].sort(),
      commitSha: node.commitSha ?? this.evidence.get(refs[0])?.commitSha ?? this.commitSha,
      attributes: { ...(current?.attributes ?? {}), ...(node.attributes ?? {}) },
      impact: current?.impact ?? { directDependents: [], transitiveDependents: [] },
    };
    this.nodes.set(node.id, merged);
    this.addClaim({
      subject: node.id,
      predicate: 'EXISTS_AS',
      object: node.type,
      tier,
      evidenceRefs: merged.evidenceRefs,
    });
    this.addClaim({
      subject: node.id,
      predicate: 'HAS_PURPOSE',
      object: node.purpose,
      tier,
      evidenceRefs: merged.evidenceRefs,
    });
    return merged;
  }

  addEdge(edge, evidenceIds = []) {
    if (!EDGE_TYPES.has(edge.type)) throw new Error(`Unknown edge type: ${edge.type}`);
    if (!edge.from || !edge.to || !edge.purpose) {
      throw new Error(`Incomplete ${edge.type} edge: ${JSON.stringify(edge)}`);
    }
    const id =
      edge.id ?? `edge:${edge.type.toLowerCase()}:${stableHash(`${edge.from}|${edge.to}`)}`;
    const refs = [...new Set(evidenceIds.length ? evidenceIds : (edge.evidenceRefs ?? []))].sort();
    const tier = refs.reduce(
      (best, evidenceId) => strongestTier(best, this.evidence.get(evidenceId)?.tier ?? 'NONE'),
      edge.evidenceTier ?? 'NONE'
    );
    const current = this.edges.get(id);
    const dependencySemantics = edge.attributes?.structural
      ? 'structural-only'
      : DEPENDENCY_EDGES.has(edge.type)
        ? 'source-depends-on-target'
        : 'assurance-or-provenance';
    const merged = {
      id,
      type: edge.type,
      from: edge.from,
      to: edge.to,
      purpose: edge.purpose,
      evidenceTier: tier,
      evidenceRefs: [...new Set([...(current?.evidenceRefs ?? []), ...refs])].sort(),
      commitSha: edge.commitSha ?? this.evidence.get(refs[0])?.commitSha ?? this.commitSha,
      attributes: {
        dependencySemantics,
        ...(current?.attributes ?? {}),
        ...(edge.attributes ?? {}),
      },
    };
    this.edges.set(id, merged);
    this.addClaim({
      subject: edge.from,
      predicate: edge.type,
      object: { nodeId: edge.to },
      tier,
      evidenceRefs: merged.evidenceRefs,
    });
    return merged;
  }

  addClaim({
    subject,
    predicate,
    object,
    tier = 'NONE',
    evidenceRefs = [],
    status = 'CURRENT',
    reasoning,
  }) {
    const key = JSON.stringify({ subject, predicate, object });
    const id = `claim:${stableHash(key, 20)}`;
    const current = this.claims.get(id);
    const mergedTier = strongestTier(current?.tier ?? 'NONE', tier);
    const mergedEvidenceRefs = [
      ...new Set([...(current?.evidenceRefs ?? []), ...evidenceRefs]),
    ].sort();
    const supportingEvidence = mergedEvidenceRefs
      .map((evidenceId) => this.evidence.get(evidenceId))
      .filter(Boolean);
    const primaryEvidence =
      supportingEvidence.find((item) => item.tier === mergedTier) ?? supportingEvidence[0];
    const claimSha = primaryEvidence?.commitSha ?? current?.commitSha ?? this.commitSha;
    if (!this.shaTimestampCache.has(claimSha)) {
      this.shaTimestampCache.set(
        claimSha,
        git(this.root, ['show', '-s', '--format=%cI', claimSha], '') || this.extractedAt
      );
    }
    this.claims.set(id, {
      id,
      subject,
      predicate,
      object,
      tier: mergedTier,
      evidenceRefs: mergedEvidenceRefs,
      status,
      reasoning,
      source: primaryEvidence?.source ?? current?.source ?? 'derived:ontology-extractor',
      commitSha: claimSha,
      timestamp:
        primaryEvidence?.completedAt ??
        primaryEvidence?.sourceRevision ??
        current?.timestamp ??
        this.shaTimestampCache.get(claimSha),
    });
    return id;
  }

  addGap(gap) {
    const id =
      gap.id ??
      `GAP-${stableHash(`${gap.kind}|${gap.subjectId}|${gap.summary}`, 12).toUpperCase()}`;
    this.gaps.set(id, {
      id,
      severity: gap.severity ?? 'medium',
      kind: gap.kind ?? 'UNKNOWN',
      subjectId: gap.subjectId,
      summary: gap.summary,
      evidenceRefs: [...new Set(gap.evidenceRefs ?? [])].sort(),
      owner: gap.owner ?? this.manifest.defaults.gapOwner,
      nextAction: gap.nextAction ?? 'Review and resolve or document an evidence-backed exception.',
      reviewDate: gap.reviewDate ?? this.manifest.defaults.gapReviewDate,
      issue: `./gap-register.md#${id.toLowerCase()}`,
      status: gap.status ?? 'open',
    });
    return id;
  }

  addConflict(conflict) {
    const id =
      conflict.id ??
      `CONFLICT-${stableHash(`${conflict.subjectId}|${conflict.predicate}`, 12).toUpperCase()}`;
    this.conflicts.set(id, {
      id,
      subjectId: conflict.subjectId,
      predicate: conflict.predicate,
      winner: conflict.winner,
      loser: conflict.loser,
      resolution: conflict.resolution,
      owner: conflict.owner ?? this.manifest.defaults.gapOwner,
      nextAction:
        conflict.nextAction ?? 'Refresh the lower-precedence source from current E0/E1 evidence.',
      evidenceRefs: [...new Set(conflict.evidenceRefs ?? [])].sort(),
      status: conflict.status ?? 'resolved',
    });
    return id;
  }

  computeImpact() {
    const reverse = new Map();
    for (const edge of this.edges.values()) {
      if (!DEPENDENCY_EDGES.has(edge.type)) continue;
      if (!reverse.has(edge.to)) reverse.set(edge.to, new Set());
      reverse.get(edge.to).add(edge.from);
    }
    for (const node of this.nodes.values()) {
      const direct = [...(reverse.get(node.id) ?? [])].sort();
      const visited = new Set();
      const queue = direct.map((id) => ({ id, depth: 1 }));
      const depthById = {};
      while (queue.length) {
        const item = queue.shift();
        if (visited.has(item.id) || item.id === node.id) continue;
        visited.add(item.id);
        depthById[item.id] = item.depth;
        for (const next of reverse.get(item.id) ?? [])
          queue.push({ id: next, depth: item.depth + 1 });
      }
      node.impact = {
        directDependents: direct,
        transitiveDependents: [...visited].sort(),
        depthById,
      };
    }
  }

  validateReferences() {
    const errors = [];
    for (const edge of this.edges.values()) {
      if (!this.nodes.has(edge.from)) errors.push(`${edge.id} has missing source ${edge.from}`);
      if (!this.nodes.has(edge.to)) errors.push(`${edge.id} has missing target ${edge.to}`);
      for (const evidenceId of edge.evidenceRefs) {
        if (!this.evidence.has(evidenceId))
          errors.push(`${edge.id} has missing evidence ${evidenceId}`);
      }
    }
    for (const node of this.nodes.values()) {
      for (const evidenceId of node.evidenceRefs) {
        if (!this.evidence.has(evidenceId))
          errors.push(`${node.id} has missing evidence ${evidenceId}`);
      }
    }
    return errors;
  }

  snapshots() {
    this.computeImpact();
    const snapshot = {
      schemaVersion: SCHEMA_VERSION,
      commitSha: this.commitSha,
      extractedAt: this.extractedAt,
    };
    return {
      nodes: {
        ...snapshot,
        nodes: [...this.nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
      },
      edges: {
        ...snapshot,
        edges: [...this.edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
      },
      ledger: {
        ...snapshot,
        evidence: [...this.evidence.values()].sort((a, b) => a.id.localeCompare(b.id)),
        claims: [...this.claims.values()].sort((a, b) => a.id.localeCompare(b.id)),
      },
    };
  }
}

export function semanticSnapshot(value) {
  const omitVolatile = (item) => {
    if (Array.isArray(item)) return item.map(omitVolatile);
    if (!item || typeof item !== 'object') return item;
    return Object.fromEntries(
      Object.entries(item)
        // commitSha is restamped on extract; rebase-merge orphans the recorded SHA
        // even when graph content is unchanged. E1 age still uses the real SHA.
        // timestamp follows git %cI, which GitHub runners may format as Z vs +00:00.
        .filter(([key]) => key !== 'extractedAt' && key !== 'commitSha' && key !== 'timestamp')
        .map(([key, child]) => [key, omitVolatile(child)])
    );
  };
  return canonical(omitVolatile(value));
}
