import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const load = <T>(name: string): T =>
  JSON.parse(fs.readFileSync(path.join(root, 'ontology', name), 'utf8')) as T;
const nodeSnapshot = load<{ commitSha: string; extractedAt: string; nodes: GraphNode[] }>(
  'nodes.json'
);
const edgeSnapshot = load<{ commitSha: string; extractedAt: string; edges: GraphEdge[] }>(
  'edges.json'
);
const ledger = load<{
  commitSha: string;
  extractedAt: string;
  evidence: Evidence[];
  claims: Claim[];
}>('evidence-ledger.json');
const metrics = load<Record<string, number | string>>('metrics.json');
const gaps = load<{ gaps: Gap[] }>('gaps.json').gaps;
const conflicts = load<{ conflicts: Conflict[] }>('conflicts.json').conflicts;
const manifest = load<SourceManifest>('source-manifest.json');
const exceptions = load<{ exceptions: SkipException[] }>('test-exceptions.json').exceptions;
const contract = load<{ $defs: Record<string, { enum?: string[] }> }>('ontology.schema.json');
const executionProofPath = process.env.ONTOLOGY_EXECUTION_PROOF;
const executionProof =
  executionProofPath && fs.existsSync(path.resolve(root, executionProofPath))
    ? (JSON.parse(
        fs.readFileSync(path.resolve(root, executionProofPath), 'utf8')
      ) as ExecutionProof)
    : undefined;

type GraphNode = {
  id: string;
  type: string;
  name: string;
  path: string;
  purpose: string;
  evidenceTier: string;
  evidenceRefs: string[];
  extractedAt?: string;
  attributes: Record<string, unknown>;
  impact: {
    directDependents: string[];
    transitiveDependents: string[];
    depthById: Record<string, number>;
  };
};
type GraphEdge = {
  id: string;
  type: string;
  from: string;
  to: string;
  purpose: string;
  evidenceRefs: string[];
  attributes: { dependencySemantics?: string };
};
type Evidence = {
  id: string;
  tier: string;
  source: string;
  path?: string;
  pathDigest?: string;
  commitSha: string;
  extractedAt: string;
  status: string;
  runId?: number;
  jobId?: number;
  testIdentity?: string;
};
type Claim = {
  id: string;
  subject: string;
  predicate: string;
  object: unknown;
  tier: string;
  evidenceRefs: string[];
  status: string;
  source: string;
  commitSha: string;
  timestamp: string;
};
type Gap = {
  id: string;
  kind: string;
  subjectId?: string;
  owner: string;
  reviewDate: string;
  nextAction: string;
};
type Conflict = {
  id: string;
  predicate: string;
  status: string;
  winner: unknown;
  loser: unknown;
  owner: string;
  nextAction: string;
  evidenceRefs: string[];
};
type SkipException = {
  id: string;
  file: string;
  anchorLine: number;
  testId: string;
  reason: string;
  owner: string;
  reviewDate: string;
  issue: string;
};
type SourceManifest = {
  defaults: { evidenceMaxAgeCommits: number };
  notionPages: Array<{
    ordinal: number;
    claims: Array<{ subjectId: string; predicate: string; object: unknown }>;
  }>;
};
type ExecutionProof = {
  headSha: string;
  evidenceTier: string;
  sourceState: string;
  runId: string | number;
  jobId: string;
  groups: Array<{
    id: string;
    status: string;
    headSha: string;
    provingTests: Array<{ nodeId: string; title: string }>;
  }>;
};

const nodes = new Map(nodeSnapshot.nodes.map((node) => [node.id, node]));
const edges = edgeSnapshot.edges;
const evidence = new Map(ledger.evidence.map((item) => [item.id, item]));
const byType = (type: string) => nodeSnapshot.nodes.filter((node) => node.type === type);
const CLIENT_FEATURE_KEYS = [
  'clientOverview',
  'clientLoans',
  'clientApplications',
  'clientPayments',
  'clientBanking',
  'clientBudget',
  'clientDocuments',
  'clientSelfService',
  'clientProfile',
] as const;
const ALWAYS_ON_FEATURE_KEYS = [
  'loans',
  'clients',
  'payments',
  'approvals',
  'tenantUsers',
  'batchOps',
] as const;
const ALL_TENANT_FEATURE_KEYS = [
  ...ALWAYS_ON_FEATURE_KEYS,
  'collections',
  'mandates',
  'ippOnboarding',
  'products',
  'whiteLabelBranding',
  'creditPolicy',
  'popiaConsent',
  'advancedAnalytics',
  'tenantReconciliation',
  'workflows',
  ...CLIENT_FEATURE_KEYS,
] as const;

const planDefaults = (planCode: string): string[] => {
  const plan = nodes.get(`plan:${planCode}`);
  expect(plan, `plan:${planCode}`).toBeDefined();
  return [...((plan?.attributes.defaultFeatures as string[] | undefined) ?? [])].sort();
};

describe('T1 inventory', () => {
  test('effective schema, feature, plan, role, function, and route inventories match the code manifests', () => {
    expect(byType('Table')).toHaveLength(95);
    // Convex Auth 0.0.95 adds Auth-owned indexes to the application index baseline.
    // baseline. The dependency-derived inventory is the current E0 fact.
    expect(byType('Index')).toHaveLength(metrics.effectiveIndexCount as number);
    expect(metrics.applicationIndexCount).toBe(190);
    expect(metrics.authIndexCount).toBe(11);
    expect(byType('Feature')).toHaveLength(32);
    expect(byType('Plan')).toHaveLength(4);
    expect(byType('Role')).toHaveLength(6);
    expect(byType('Function')).toHaveLength(metrics.functionCount as number);
    expect(byType('Route')).toHaveLength(metrics.routeCount as number);
    expect(metrics.applicationTableCount).toBe(88);
    expect(metrics.authTableCount).toBe(7);
  });

  test('client catalogue and seeded plan defaults match the commercial contract exactly', () => {
    const clientFeatures = byType('Feature')
      .filter((feature) => feature.attributes.console === 'client')
      .map((feature) => feature.attributes.key as string)
      .sort();
    expect(clientFeatures).toEqual([...CLIENT_FEATURE_KEYS].sort());

    const starter = [
      ...ALWAYS_ON_FEATURE_KEYS,
      ...CLIENT_FEATURE_KEYS,
      // clientBanking depends on this backoffice payment-rail capability.
      'ippOnboarding',
    ].sort();
    const pro = [...starter, 'collections', 'products', 'advancedAnalytics', 'creditPolicy'].sort();
    const allTenant = [...ALL_TENANT_FEATURE_KEYS].sort();

    expect(planDefaults('starter')).toEqual(starter);
    expect(planDefaults('pro')).toEqual(pro);
    expect(planDefaults('enterprise')).toEqual(allTenant);
    expect(planDefaults('all_features')).toEqual(allTenant);
    for (const planCode of ['starter', 'pro', 'enterprise', 'all_features']) {
      expect(planDefaults(planCode)).toEqual(
        expect.arrayContaining([...CLIENT_FEATURE_KEYS, 'ippOnboarding'])
      );
    }
  });

  test('supplied numeric claims are verified or registered as contradicted', () => {
    const actual: Record<string, number> = {
      HAS_EFFECTIVE_TABLE_COUNT: metrics.effectiveTableCount as number,
      HAS_APPLICATION_TABLE_COUNT: metrics.applicationTableCount as number,
      HAS_AUTH_TABLE_COUNT: metrics.authTableCount as number,
      HAS_FEATURE_COUNT: metrics.featureCount as number,
      HAS_SEEDED_PLAN_COUNT: metrics.planCount as number,
      HAS_GATED_ENTRY_POINT_COUNT: metrics.gatedEntryPointCount as number,
      HAS_GATED_FEATURE_COUNT: metrics.gatedFeatureCount as number,
    };
    for (const page of manifest.notionPages) {
      for (const claim of page.claims) {
        if (typeof claim.object !== 'number' || !(claim.predicate in actual)) continue;
        if (claim.object === actual[claim.predicate]) continue;
        expect(
          conflicts.some(
            (conflict) =>
              conflict.id === `CONFLICT-${claim.predicate}-${page.ordinal}` &&
              conflict.status === 'resolved'
          )
        ).toBe(true);
      }
    }
    expect(
      conflicts.some(
        (conflict) =>
          conflict.predicate === 'HAS_EFFECTIVE_TABLE_COUNT' &&
          JSON.stringify(conflict.loser).includes('86') &&
          JSON.stringify(conflict.winner).includes('95')
      )
    ).toBe(true);
  });
});

describe('T2 integrity', () => {
  test('type registries are closed and every node and edge has purpose and evidence', () => {
    const nodeTypes = new Set(contract.$defs.nodeType.enum ?? []);
    const edgeTypes = new Set(contract.$defs.edgeType.enum ?? []);
    expect(nodeTypes.size).toBeGreaterThan(0);
    expect(edgeTypes.size).toBeGreaterThan(0);
    for (const node of nodeSnapshot.nodes) {
      expect(nodeTypes.has(node.type), node.id).toBe(true);
      expect(node.name.trim(), node.id).not.toBe('');
      expect(node.path.trim(), node.id).not.toBe('');
      expect(node.purpose.trim(), node.id).not.toBe('');
      expect(node.evidenceRefs.length, node.id).toBeGreaterThan(0);
      expect(
        node.evidenceRefs.every((id) => evidence.has(id)),
        node.id
      ).toBe(true);
      expect(node.impact.directDependents).toBeInstanceOf(Array);
      expect(node.impact.transitiveDependents).toBeInstanceOf(Array);
    }
    for (const edge of edges) {
      expect(edgeTypes.has(edge.type), edge.id).toBe(true);
      expect(nodes.has(edge.from), edge.id).toBe(true);
      expect(nodes.has(edge.to), edge.id).toBe(true);
      expect(edge.purpose.trim(), edge.id).not.toBe('');
      expect(edge.evidenceRefs.length, edge.id).toBeGreaterThan(0);
      expect(
        ['structural-only', 'source-depends-on-target', 'assurance-or-provenance'],
        edge.id
      ).toContain(edge.attributes.dependencySemantics);
    }
    const tiers = new Set(contract.$defs.tier.enum ?? []);
    const statuses = new Set(contract.$defs.status.enum ?? []);
    for (const claim of ledger.claims) {
      expect(tiers.has(claim.tier), claim.id).toBe(true);
      expect(statuses.has(claim.status), claim.id).toBe(true);
      expect(claim.source.trim(), claim.id).not.toBe('');
      expect(claim.commitSha.trim(), claim.id).not.toBe('');
      expect(Date.parse(claim.timestamp), claim.id).not.toBeNaN();
      expect(
        claim.evidenceRefs.every((id) => evidence.has(id)),
        claim.id
      ).toBe(true);
    }
  });

  test('edge directions follow the registered ontology contract', () => {
    const allowed: Record<string, [string[], string[]]> = {
      INDEXES: [['Index'], ['Table']],
      ROUTES_TO: [['Route'], ['Component']],
      ENTITLES: [['Plan'], ['Feature']],
      ENFORCED_BY: [['Feature'], ['Flag']],
      READS: [['Function'], ['Table']],
      WRITES: [['Function'], ['Table']],
      CALLS: [['Function'], ['Function']],
      RENDERS: [['Component'], ['Component']],
      INVOKES: [['Component'], ['Function']],
      USES_INDEX: [['Function'], ['Index']],
      HANDLED_BY: [['Endpoint'], ['Function']],
      SCHEDULES: [['Schedule'], ['Function']],
      OWNED_BY: [['Endpoint'], ['ExternalSystem']],
      NOTIFIES_VIA: [['Function'], ['ExternalSystem']],
      POSTS_TO: [['Function'], ['ExternalSystem']],
      SETTLES_VIA: [['Function'], ['ExternalSystem']],
    };
    for (const edge of edges) {
      const rule = allowed[edge.type];
      if (!rule) continue;
      expect(rule[0], edge.id).toContain(nodes.get(edge.from)?.type);
      expect(rule[1], edge.id).toContain(nodes.get(edge.to)?.type);
    }
  });

  test('all functional orphans are registered gaps', () => {
    for (const gap of gaps.filter((item) => item.kind === 'FUNCTIONAL_ORPHAN')) {
      expect(nodes.has(gap.subjectId ?? ''), gap.id).toBe(true);
      expect(
        (nodes.get(gap.subjectId ?? '')?.attributes.gapIds as string[] | undefined) ?? []
      ).toContain(gap.id);
    }
  });
});

describe('T3 wiring', () => {
  test('tables, routes, features, and external systems have evidenced wiring or an explicit gap', () => {
    for (const table of byType('Table')) {
      const connected = edges.some(
        (edge) => ['READS', 'WRITES'].includes(edge.type) && edge.to === table.id
      );
      const excepted =
        Boolean(table.attributes.connectivityException) ||
        gaps.some((gap) => gap.kind === 'TABLE_CONNECTIVITY' && gap.subjectId === table.id);
      expect(connected || excepted, table.id).toBe(true);
    }
    for (const route of byType('Route')) {
      expect(
        edges.some((edge) => edge.type === 'ROUTES_TO' && edge.from === route.id),
        route.id
      ).toBe(true);
      expect(
        edges.some((edge) => edge.type === 'GATED_BY' && edge.from === route.id),
        route.id
      ).toBe(true);
    }
    for (const feature of byType('Feature')) {
      const planWired = edges.some((edge) => edge.type === 'ENTITLES' && edge.to === feature.id);
      expect(planWired || Boolean(feature.attributes.ungatedReason), feature.id).toBe(true);
      if (!feature.attributes.ungatedReason) {
        expect(
          edges.some((edge) => edge.type === 'ENFORCED_BY' && edge.from === feature.id),
          feature.id
        ).toBe(true);
      }
    }
    for (const external of byType('ExternalSystem')) {
      expect(
        edges.some((edge) => edge.type === 'OWNED_BY' && edge.to === external.id),
        external.id
      ).toBe(true);
    }
  });
});

describe('T4 behaviour', () => {
  test('required lifecycle and financial invariant mappings resolve to named test declarations', () => {
    const coverage = ledger.claims.filter(
      (claim) =>
        claim.subject.startsWith('coverage:') &&
        claim.predicate === 'MAPPED_TO_TEST_DECLARATION_COUNT'
    );
    expect(coverage.length).toBeGreaterThanOrEqual(18);
    for (const claim of coverage) expect(Number(claim.object), claim.subject).toBeGreaterThan(0);
  });

  test('CI execution proof names a passing current-SHA test for every mapped behaviour', () => {
    if (!executionProof) {
      expect(
        Boolean(process.env.ONTOLOGY_REQUIRE_EXECUTION_PROOF),
        'The proof-enforcement job must set ONTOLOGY_EXECUTION_PROOF to a current-SHA proof JSON'
      ).toBe(false);
      return;
    }
    if (process.env.GITHUB_SHA) {
      expect(executionProof.headSha).toBe(process.env.GITHUB_SHA);
      expect(executionProof.evidenceTier).toBe('E1');
      expect(executionProof.sourceState).toBe('COMMIT_BOUND');
    } else {
      expect(['WORKTREE', nodeSnapshot.commitSha]).toContain(executionProof.headSha);
      expect(executionProof.evidenceTier).toBe('E3');
    }
    expect(executionProof.runId).toBeTruthy();
    expect(executionProof.jobId).toBeTruthy();
    for (const group of executionProof.groups) {
      expect(group.headSha, group.id).toBe(executionProof.headSha);
      expect(group.status, group.id).toBe('PROVEN');
      expect(group.provingTests.length, group.id).toBeGreaterThan(0);
      for (const proving of group.provingTests)
        expect(nodes.get(proving.nodeId)?.type, proving.nodeId).toBe('Test');
    }
  });

  test('enforcement flags default to false', () => {
    for (const id of [
      'flag:TENANCY_ENFORCEMENT',
      'flag:ENTITLEMENT_ENFORCEMENT',
      'flag:MANDATE_AUTODEBIT_ENABLED',
    ]) {
      expect(nodes.get(id)?.attributes.defaultValue, id).toBe(false);
    }
  });
});

describe('T5 coherence', () => {
  test('every repository or Notion mismatch has a complete precedence resolution', () => {
    for (const conflict of conflicts) {
      expect(conflict.status, conflict.id).toBe('resolved');
      expect(conflict.winner, conflict.id).toBeTruthy();
      expect(conflict.loser, conflict.id).toBeTruthy();
      expect(conflict.owner, conflict.id).toBe('NamLend Engineering');
      expect(conflict.nextAction.trim(), conflict.id).not.toBe('');
      expect(conflict.evidenceRefs.length, conflict.id).toBeGreaterThan(0);
    }
    expect(gaps.some((gap) => gap.id === 'GAP-NOTION-SHARED-CREDENTIALS')).toBe(true);
  });

  test('every detected skip has a stable reviewed exception identity', () => {
    expect(new Set(exceptions.map((entry) => entry.id)).size).toBe(exceptions.length);
    for (const entry of exceptions) {
      expect(entry.testId, entry.id).toMatch(/^(test|describe):/);
      expect(entry.reason.trim(), entry.id).not.toBe('');
      expect(entry.owner, entry.id).toBe('NamLend Engineering');
      expect(Number.isNaN(Date.parse(entry.reviewDate)), entry.id).toBe(false);
      expect(Date.parse(entry.reviewDate), entry.id).toBeGreaterThanOrEqual(
        Date.parse(nodeSnapshot.extractedAt)
      );
      expect(entry.issue, entry.id).toContain('gap-register.md#');
    }
    expect(
      gaps.some((gap) => ['UNREGISTERED_TEST_SKIP', 'STALE_SKIP_EXCEPTION'].includes(gap.kind))
    ).toBe(false);
  });
});

describe('T6 freshness', () => {
  test('snapshots and evidence carry extraction timestamps and path-aware SHAs', () => {
    expect(Date.parse(nodeSnapshot.extractedAt)).not.toBeNaN();
    expect(Date.parse(edgeSnapshot.extractedAt)).not.toBeNaN();
    expect(Date.parse(ledger.extractedAt)).not.toBeNaN();
    for (const item of ledger.evidence) {
      expect(Date.parse(item.extractedAt), item.id).not.toBeNaN();
      expect(item.commitSha.trim(), item.id).not.toBe('');
      expect(item.source.trim(), item.id).not.toBe('');
      if (
        item.tier === 'E0' &&
        item.path &&
        fs.existsSync(path.join(root, item.path)) &&
        fs.statSync(path.join(root, item.path)).isFile()
      ) {
        const digest = `sha256:${createHash('sha256')
          .update(fs.readFileSync(path.join(root, item.path)))
          .digest('hex')}`;
        expect(item.pathDigest, item.id).toBe(digest);
      }
    }
  });

  test('successful E1 proof is no more than ten commits old', () => {
    const recent = ledger.evidence.filter((item) => {
      if (item.tier !== 'E1' || item.conclusion !== 'success') return false;
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', item.commitSha, 'HEAD'], {
          cwd: root,
          stdio: 'ignore',
        });
        const count = Number(
          execFileSync('git', ['rev-list', '--count', `${item.commitSha}..HEAD`], {
            cwd: root,
            encoding: 'utf8',
          }).trim()
        );
        return count <= manifest.defaults.evidenceMaxAgeCommits;
      } catch {
        return false;
      }
    });
    expect(recent.length).toBeGreaterThan(0);
  });
});
