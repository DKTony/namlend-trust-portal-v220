import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import YAML from 'yaml';
import { authTables } from '@convex-dev/auth/server';
import {
  OntologyGraph,
  cleanComment,
  domainFromPath,
  humanize,
  jsDocText,
  lineOf,
  readJson,
  safeIdPart,
  stableHash,
  trackedFiles,
  writeJson,
} from './model.mjs';

const CONVEX_WRAPPERS = new Set([
  'query',
  'mutation',
  'action',
  'internalQuery',
  'internalMutation',
  'internalAction',
]);

const TEST_FILE_RE = /(?:\.test\.[tj]sx?|\.(?:e2e|spec)\.ts)$/;

function sourceFile(root, file, scriptKind) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);
}

function propertyName(property, sf) {
  if (!property?.name) return '';
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) return property.name.text;
  return property.name.getText(sf).replace(/^['"]|['"]$/g, '');
}

function objectProperty(object, name, sf) {
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
  return object.properties.find((property) => propertyName(property, sf) === name);
}

function unwrap(expression) {
  let current = expression;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isSatisfiesExpression?.(current))
  ) {
    current = current.expression;
  }
  return current;
}

function literal(expression, sf) {
  const current = unwrap(expression);
  if (!current) return undefined;
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text;
  if (current.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (current.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (current.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isNumericLiteral(current)) return Number(current.text);
  if (ts.isArrayLiteralExpression(current)) {
    return current.elements.map((item) => literal(item, sf)).filter((item) => item !== undefined);
  }
  return undefined;
}

function evidenceFor(graph, file, sf, node, symbol, tier = 'E0', extra = {}) {
  return graph.addEvidence({
    tier,
    source: tier === 'E0' ? `code:${file}` : extra.source ?? file,
    path: file,
    symbol,
    line: node ? lineOf(sf, node) : 1,
    ...extra,
  });
}

function addContainment(graph, systemId, nodeId, evidenceId) {
  if (systemId === nodeId) return;
  graph.addEdge(
    {
      type: 'CONTAINS',
      from: systemId,
      to: nodeId,
      purpose: `${systemId} contains ${nodeId} within the active system boundary.`,
      attributes: { structural: true },
    },
    [evidenceId]
  );
}

function functionIdFromApiReference(reference) {
  const parts = String(reference).split('.').filter(Boolean);
  if (parts.length < 2) return undefined;
  const symbol = parts.pop();
  return `function:convex:${parts.join('/')}.${symbol}`;
}

export function createBaseGraph({ root, commitSha, extractedAt, manifest }) {
  const graph = new OntologyGraph({ root, commitSha, extractedAt, manifest });
  const appFile = 'src/App.tsx';
  const convexFile = 'convex/schema.ts';
  const appEvidence = graph.addEvidence({
    tier: 'E0',
    source: `code:${appFile}`,
    path: appFile,
    symbol: 'App',
    line: 1,
  });
  const convexEvidence = graph.addEvidence({
    tier: 'E0',
    source: `code:${convexFile}`,
    path: convexFile,
    symbol: 'default schema',
    line: 1,
  });
  const workflowEvidence = graph.addEvidence({
    tier: 'E0',
    source: 'code:.github/workflows/ci-web.yml',
    path: '.github/workflows/ci-web.yml',
    symbol: 'jobs',
    line: 1,
  });
  const systems = [
    ['system:namlend-web', 'NamLend web application', 'src/', 'Runs the borrower, backoffice, and platform React consoles.', 'web', appEvidence],
    ['system:namlend-convex', 'NamLend Convex backend', 'convex/', 'Runs authenticated data access, financial workflows, external actions, HTTP routes, and schedules.', 'backend', convexEvidence],
    ['system:namlend-tests', 'NamLend verification suites', 'src/**/*.test.* | convex/**/*.test.ts | e2e/', 'Defines executable unit, Convex integration, and Playwright browser evidence.', 'testing', workflowEvidence],
    ['system:namlend-ci', 'NamLend continuous integration', '.github/workflows/', 'Runs the repository quality, security, build, browser, and ontology verification gates.', 'ci', workflowEvidence],
    ['system:namlend-docs', 'NamLend active documentation', 'docs/ | Notion pages ①–⑧', 'Records architecture and operating claims that must be checked against code and CI.', 'documentation', workflowEvidence],
    ['system:namlend-agent-harness', 'NamLend AI engineering harness', 'agent-harness/ | scripts/agent-harness/', 'Constrains agent tasks, context, receipts, risk policy, evaluation, and durable evidence publication.', 'assurance', workflowEvidence],
    ['system:graphify-sidecar', 'Graphify discovery sidecar', 'tools/graphify/ | scripts/graphify/', 'Provides replaceable local code-graph discovery without establishing authoritative evidence.', 'assurance', workflowEvidence],
  ];
  for (const [id, name, nodePath, purpose, domain, evidence] of systems) {
    graph.addNode({ id, type: 'System', name, path: nodePath, purpose, domain }, [evidence]);
  }

  const policies = [
    ['access-policy:public', 'Public access', 'Allows an unauthenticated caller to resolve a deliberately public route or endpoint.'],
    ['access-policy:authenticated', 'Authenticated access', 'Requires a valid Convex Auth session without requiring a specific assignable role.'],
  ];
  for (const [id, name, purpose] of policies) {
    graph.addNode(
      { id, type: 'AccessPolicy', name, path: 'src/components/system/ProtectedRoute.tsx', purpose, domain: 'auth' },
      [appEvidence]
    );
    addContainment(graph, 'system:namlend-web', id, appEvidence);
  }
  return graph;
}

export function extractAgentHarness(graph, root) {
  const policyFile = 'agent-harness/policy.json';
  const policy = readJson(path.join(root, policyFile));
  const policyEvidence = graph.addEvidence({
    tier: 'E0', source: `code:${policyFile}`, path: policyFile, symbol: 'agent harness policy', line: 1
  });
  const decisions = [
    ['decision:adr-0001', 'ADR 0001: authoritative ontology and Graphify sidecar', 'docs/adr/0001-authoritative-ontology-graphify-sidecar.md', 'Records the reviewed decision that Graphify is discovery-only and the NamLend ontology remains authoritative.'],
    ['decision:adr-0002', 'ADR 0002: risk-tiered agent authority', 'docs/adr/0002-risk-tiered-agent-authority.md', 'Records the reviewed R0-R3 authority model and human merge boundary.'],
  ];
  for (const [id, name, nodePath, purpose] of decisions) {
    const evidence = graph.addEvidence({ tier: 'E0', source: `code:${nodePath}`, path: nodePath, symbol: name, line: 1 });
    graph.addNode({ id, type: 'DecisionRecord', name, path: nodePath, purpose, domain: 'assurance', attributes: { reviewed: true } }, [evidence]);
    addContainment(graph, 'system:namlend-agent-harness', id, evidence);
  }
  const schemas = [
    ['task-contract.schema.json', 'Agent task contract', 'AgentTask', 'Defines bounded goal, risk, scope, checks, budget, and expiry for an agent task.'],
    ['context-packet.schema.json', 'Agent context packet', 'Artifact', 'Defines cited repository context derived from the authoritative ontology and optional discovery cache.'],
    ['agent-run-receipt.schema.json', 'Agent run receipt', 'AgentRun', 'Defines a redacted task-local record of an agent run and its verification evidence.'],
    ['merge-receipt.schema.json', 'Reviewed merge receipt', 'Receipt', 'Defines the compact durable receipt published only after review, merge, and green current-SHA CI.'],
    ['policy-exception.schema.json', 'Policy exception', 'Artifact', 'Defines scoped, evidenced, owned, expiring exceptions that cannot waive hard safety gaps.'],
  ];
  for (const [file, name, type, purpose] of schemas) {
    const nodePath = `agent-harness/schemas/${file}`;
    const evidence = graph.addEvidence({ tier: 'E0', source: `code:${nodePath}`, path: nodePath, symbol: name, line: 1 });
    const id = `${type === 'AgentTask' ? 'agent-task' : type === 'AgentRun' ? 'agent-run' : type.toLowerCase()}:schema:${file.replace('.schema.json', '')}`;
    graph.addNode({ id, type, name, path: nodePath, purpose, domain: 'assurance', attributes: { schema: true, schemaVersion: '1.0.0' } }, [evidence]);
    addContainment(graph, 'system:namlend-agent-harness', id, evidence);
  }
  const workflowPath = 'WORKFLOW.md';
  const workflowEvidence = graph.addEvidence({ tier: 'E0', source: `code:${workflowPath}`, path: workflowPath, symbol: 'disabled Symphony shadow workflow', line: 1 });
  graph.addNode({
    id: 'artifact:symphony-shadow-workflow', type: 'Artifact', name: 'Disabled Symphony shadow workflow', path: workflowPath,
    purpose: 'Stages a read-only R0 Symphony workflow that remains disabled until promotion gates pass.', domain: 'assurance',
    attributes: { enabled: false, mode: 'shadow', eligibleRiskClasses: ['R0'], maxConcurrentAgents: 1 }
  }, [workflowEvidence]);
  addContainment(graph, 'system:namlend-agent-harness', 'artifact:symphony-shadow-workflow', workflowEvidence);
  graph.addEdge({
    type: 'APPROVED_BY', from: 'artifact:symphony-shadow-workflow', to: 'decision:adr-0002',
    purpose: 'The disabled workflow is governed by the reviewed risk-tiered authority decision.'
  }, [workflowEvidence]);

  const securityPath = 'agent-harness/security-findings.json';
  const securityEvidence = graph.addEvidence({ tier: 'E0', source: `code:${securityPath}`, path: securityPath, symbol: 'redacted security finding registry', line: 1 });
  graph.addNode({
    id: 'artifact:security-finding-registry', type: 'Artifact', name: 'Redacted security finding registry', path: securityPath,
    purpose: 'Records owned security finding states and proof-safe remediation metadata without credential values or provider payloads.', domain: 'assurance',
    attributes: { containsSecretValues: false, appendOnlyResolutionMetadata: true }
  }, [securityEvidence]);
  addContainment(graph, 'system:namlend-agent-harness', 'artifact:security-finding-registry', securityEvidence);
  graph.addEdge({
    type: 'VERIFIED_BY', from: 'artifact:security-finding-registry', to: 'decision:adr-0002',
    purpose: 'The risk-tiered authority decision governs hard security finding treatment and human remediation.'
  }, [securityEvidence]);

  const graphifyPath = 'tools/graphify/pyproject.toml';
  const graphifyEvidence = graph.addEvidence({ tier: 'E0', source: `code:${graphifyPath}`, path: graphifyPath, symbol: 'graphifyy==0.9.40', line: 1 });
  graph.addNode({
    id: 'artifact:graphify-discovery-cache', type: 'Artifact', name: 'Graphify discovery cache', path: '.cache/graphify/',
    purpose: 'Caches a replaceable code-only graph for exploratory discovery and never supplies authoritative evidence.', domain: 'assurance',
    attributes: { toolVersion: '0.9.40', authoritative: false, codeOnly: true, queryLogging: false }
  }, [graphifyEvidence]);
  addContainment(graph, 'system:graphify-sidecar', 'artifact:graphify-discovery-cache', graphifyEvidence);
  graph.addEdge({
    type: 'VERIFIED_BY', from: 'artifact:graphify-discovery-cache', to: 'decision:adr-0001',
    purpose: 'ADR 0001 defines the discovery-only evidence boundary for Graphify output.'
  }, [graphifyEvidence]);

  graph.addClaim({
    subject: 'system:namlend-agent-harness', predicate: 'AUTONOMOUS_RISK_CLASSES', object: policy.autonomousRiskClasses,
    tier: 'E0', evidenceRefs: [policyEvidence]
  });
  graph.addClaim({
    subject: 'system:namlend-agent-harness', predicate: 'PROTECTED_MINIMUM_HUMAN_APPROVALS', object: policy.protectedMinimumHumanApprovals,
    tier: 'E0', evidenceRefs: [policyEvidence]
  });
}

function unwrapTableExpression(expression, sf) {
  const indexes = [];
  let current = unwrap(expression);
  while (current && ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    const method = current.expression.name.text;
    if (method === 'index' || method === 'searchIndex' || method === 'vectorIndex') {
      indexes.push({
        kind: method,
        name: literal(current.arguments[0], sf) ?? current.arguments[0]?.getText(sf),
        fields: literal(current.arguments[1], sf) ?? current.arguments[1]?.getText(sf),
        node: current,
      });
      current = unwrap(current.expression.expression);
      continue;
    }
    break;
  }
  if (
    current &&
    ts.isCallExpression(current) &&
    ts.isIdentifier(current.expression) &&
    current.expression.text === 'defineTable'
  ) {
    return { fields: current.arguments[0], indexes: indexes.reverse(), call: current };
  }
  return undefined;
}

function authValidatorShape(validator) {
  if (!validator) return { type: 'unknown' };
  const result = { type: validator.kind ?? 'unknown', optional: validator.isOptional === 'optional' };
  if (validator.tableName) result.table = validator.tableName;
  if (validator.value !== undefined) result.value = validator.value;
  if (validator.members) result.members = validator.members.map(authValidatorShape);
  if (validator.element) result.element = authValidatorShape(validator.element);
  return result;
}

export function extractSchema(graph, root) {
  const file = 'convex/schema.ts';
  const sf = sourceFile(root, file, ts.ScriptKind.TS);
  let schemaObject;
  const visit = (node) => {
    if (
      ts.isExportAssignment(node) &&
      ts.isCallExpression(unwrap(node.expression)) &&
      unwrap(node.expression).expression.getText(sf) === 'defineSchema'
    ) {
      schemaObject = unwrap(node.expression).arguments[0];
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!schemaObject || !ts.isObjectLiteralExpression(schemaObject)) throw new Error('Unable to locate defineSchema object');

  let applicationTableCount = 0;
  let applicationIndexCount = 0;
  for (const property of schemaObject.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const tableName = propertyName(property, sf);
    const parsed = unwrapTableExpression(property.initializer, sf);
    if (!parsed) continue;
    applicationTableCount += 1;
    const fields = {};
    if (parsed.fields && ts.isObjectLiteralExpression(parsed.fields)) {
      for (const field of parsed.fields.properties) {
        if (!ts.isPropertyAssignment(field)) continue;
        fields[propertyName(field, sf)] = field.initializer.getText(sf);
      }
    }
    const evidence = evidenceFor(graph, file, sf, property, tableName);
    const purpose =
      jsDocText(ts, sf, property) || `Stores ${humanize(tableName).toLowerCase()} records defined by the active Convex schema.`;
    graph.addNode(
      {
        id: `table:${tableName}`,
        type: 'Table',
        name: tableName,
        path: file,
        purpose,
        domain: domainFromPath(tableName),
        attributes: { fields, sourceKind: 'application', indexCount: parsed.indexes.length },
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-convex', `table:${tableName}`, evidence);
    for (const index of parsed.indexes) {
      applicationIndexCount += 1;
      const indexEvidence = evidenceFor(graph, file, sf, index.node, `${tableName}.${index.name}`);
      const indexId = `index:${tableName}:${index.name}`;
      graph.addNode(
        {
          id: indexId,
          type: 'Index',
          name: index.name,
          path: file,
          purpose: `Indexes ${tableName} by ${Array.isArray(index.fields) ? index.fields.join(', ') : index.fields}.`,
          domain: domainFromPath(tableName),
          attributes: { table: tableName, fields: index.fields, kind: index.kind },
        },
        [indexEvidence]
      );
      graph.addEdge(
        { type: 'INDEXES', from: indexId, to: `table:${tableName}`, purpose: `${index.name} indexes ${tableName}.` },
        [indexEvidence]
      );
      addContainment(graph, 'system:namlend-convex', indexId, indexEvidence);
    }
  }

  let authIndexCount = 0;
  for (const [tableName, definition] of Object.entries(authTables)) {
    const packagePath = 'node_modules/@convex-dev/auth/src/server/implementation/types.ts';
    const evidence = graph.addEvidence({
      tier: 'E0',
      source: 'dependency:@convex-dev/auth',
      path: packagePath,
      symbol: `authTables.${tableName}`,
      line: 36,
      packageVersion: '@convex-dev/auth',
    });
    const fields = Object.fromEntries(
      Object.entries(definition.validator?.fields ?? {}).map(([name, validator]) => [name, authValidatorShape(validator)])
    );
    graph.addNode(
      {
        id: `table:${tableName}`,
        type: 'Table',
        name: tableName,
        path: packagePath,
        purpose: `Stores ${humanize(tableName).toLowerCase()} records managed by Convex Auth.`,
        domain: 'auth',
        attributes: { fields, sourceKind: 'convex-auth', indexCount: definition.indexes.length },
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-convex', `table:${tableName}`, evidence);
    for (const index of definition.indexes) {
      authIndexCount += 1;
      const indexId = `index:${tableName}:${index.indexDescriptor}`;
      graph.addNode(
        {
          id: indexId,
          type: 'Index',
          name: index.indexDescriptor,
          path: packagePath,
          purpose: `Indexes ${tableName} by ${index.fields.join(', ')} for Convex Auth.`,
          domain: 'auth',
          attributes: { table: tableName, fields: index.fields, kind: 'index' },
        },
        [evidence]
      );
      graph.addEdge(
        { type: 'INDEXES', from: indexId, to: `table:${tableName}`, purpose: `${index.indexDescriptor} indexes ${tableName}.` },
        [evidence]
      );
      addContainment(graph, 'system:namlend-convex', indexId, evidence);
    }
  }
  return {
    applicationTableCount,
    authTableCount: Object.keys(authTables).length,
    effectiveTableCount: applicationTableCount + Object.keys(authTables).length,
    applicationIndexCount,
    authIndexCount,
    effectiveIndexCount: applicationIndexCount + authIndexCount,
    schemaEvidence: evidenceFor(graph, file, sf, schemaObject, 'defineSchema'),
  };
}

function parseFeatureObject(object, sf) {
  const output = {};
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propertyName(property, sf);
    output[name] = literal(property.initializer, sf) ?? property.initializer.getText(sf);
  }
  return output;
}

function findArrayVariable(sf, variableName) {
  let result;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      const expression = unwrap(node.initializer);
      if (expression && ts.isArrayLiteralExpression(expression)) result = { declaration: node, array: expression };
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return result;
}

export function extractFeaturesPlansFlagsRoles(graph, root, files) {
  const featureFile = 'convex/lib/features.ts';
  const featureSf = sourceFile(root, featureFile, ts.ScriptKind.TS);
  const featureArray = findArrayVariable(featureSf, 'FEATURES');
  if (!featureArray) throw new Error('Unable to locate FEATURES manifest');
  const features = [];
  for (const element of featureArray.array.elements) {
    const object = unwrap(element);
    if (!ts.isObjectLiteralExpression(object)) continue;
    const feature = parseFeatureObject(object, featureSf);
    if (!feature.key) continue;
    const evidence = evidenceFor(graph, featureFile, featureSf, object, feature.key);
    const id = `feature:${feature.key}`;
    graph.addNode(
      {
        id,
        type: 'Feature',
        name: feature.name ?? feature.key,
        path: featureFile,
        purpose: `Provides the ${feature.name ?? humanize(feature.key)} capability in the ${feature.console} console.`,
        domain: feature.category ?? 'entitlements',
        attributes: feature,
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-web', id, evidence);
    for (const dependency of feature.dependsOn ?? []) {
      graph.addEdge(
        { type: 'DEPENDS_ON', from: id, to: `feature:${dependency}`, purpose: `${feature.key} requires ${dependency}.` },
        [evidence]
      );
    }
    features.push({ ...feature, evidence });
  }

  const seedFile = 'convex/platform/seed.ts';
  const seedSf = sourceFile(root, seedFile, ts.ScriptKind.TS);
  const planArray = findArrayVariable(seedSf, 'PLAN_DEFS');
  if (!planArray) throw new Error('Unable to locate PLAN_DEFS');
  const plans = [];
  const alwaysOn = features.filter((feature) => feature.alwaysOn).map((feature) => feature.key);
  const backoffice = features.filter((feature) => feature.console === 'backoffice').map((feature) => feature.key);
  const client = features.filter((feature) => feature.console === 'client').map((feature) => feature.key);
  const tenantGrantable = features.filter((feature) => feature.console !== 'platform').map((feature) => feature.key);
  const featureDependencies = new Map(
    features.map((feature) => [feature.key, feature.dependsOn ?? []])
  );
  const withDependencyClosure = (featureKeys) => {
    const closed = new Set();
    const visit = (featureKey) => {
      if (closed.has(featureKey)) return;
      closed.add(featureKey);
      for (const dependency of featureDependencies.get(featureKey) ?? []) visit(dependency);
    };
    for (const featureKey of featureKeys) visit(featureKey);
    return [...closed];
  };
  const expandFeatureExpression = (expression) => {
    const value = unwrap(expression);
    if (!value) return [];
    if (ts.isArrayLiteralExpression(value)) {
      return value.elements.flatMap((item) => {
        if (ts.isSpreadElement(item)) return expandFeatureExpression(item.expression);
        const literalValue = literal(item, seedSf);
        return typeof literalValue === 'string' ? [literalValue] : [];
      });
    }
    if (ts.isCallExpression(value) && callName(value, seedSf) === 'withFeatureDependencyClosure') {
      return withDependencyClosure(
        value.arguments.flatMap((argument) => expandFeatureExpression(argument))
      );
    }
    const symbol = value.getText(seedSf);
    if (symbol === 'ALWAYS_ON_FEATURES') return alwaysOn;
    if (symbol === 'BACKOFFICE_FEATURES') return backoffice;
    if (symbol === 'CLIENT_FEATURE_KEYS') return client;
    if (symbol === 'ALL_TENANT_FEATURES') return tenantGrantable;
    return [];
  };
  for (const element of planArray.array.elements) {
    const object = unwrap(element);
    if (!ts.isObjectLiteralExpression(object)) continue;
    const planCodeProperty = objectProperty(object, 'planCode', seedSf);
    const nameProperty = objectProperty(object, 'name', seedSf);
    const featuresProperty = objectProperty(object, 'features', seedSf);
    const planCode = literal(planCodeProperty?.initializer, seedSf);
    if (!planCode) continue;
    const defaultFeatures = expandFeatureExpression(featuresProperty?.initializer);
    const evidence = evidenceFor(graph, seedFile, seedSf, object, planCode);
    const id = `plan:${planCode}`;
    graph.addNode(
      {
        id,
        type: 'Plan',
        name: literal(nameProperty?.initializer, seedSf) ?? planCode,
        path: seedFile,
        purpose: `Seeds the ${planCode} commercial plan with its default feature set.`,
        domain: 'entitlements',
        attributes: { planCode, defaultFeatures: [...new Set(defaultFeatures)].sort(), price: 'NOT_STATED' },
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-convex', id, evidence);
    for (const featureKey of new Set(defaultFeatures)) {
      if (!graph.nodes.has(`feature:${featureKey}`)) continue;
      graph.addEdge(
        { type: 'ENTITLES', from: id, to: `feature:${featureKey}`, purpose: `${planCode} grants ${featureKey} by default.` },
        [evidence]
      );
    }
    plans.push({ planCode, defaultFeatures, evidence });
  }

  const flagOccurrences = new Map();
  const flagPattern = /getBooleanRule(?:Query)?\s*\([^;]*?['"]([A-Z][A-Z0-9_]+)['"]\s*,\s*(true|false)/gs;
  const objectPattern = /ruleCode:\s*['"]([A-Z][A-Z0-9_]+)['"][\s\S]{0,160}?fallback:\s*(true|false)/g;
  for (const file of files.filter((candidate) => candidate.startsWith('convex/') && candidate.endsWith('.ts') && !TEST_FILE_RE.test(candidate))) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const pattern of [flagPattern, objectPattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text))) {
        if (!flagOccurrences.has(match[1])) flagOccurrences.set(match[1], []);
        flagOccurrences.get(match[1]).push({ file, offset: match.index, defaultValue: match[2] === 'true' });
      }
    }
  }
  for (const expected of ['TENANCY_ENFORCEMENT', 'ENTITLEMENT_ENFORCEMENT', 'MANDATE_AUTODEBIT_ENABLED']) {
    if (!flagOccurrences.has(expected)) flagOccurrences.set(expected, []);
  }
  for (const [code, occurrences] of flagOccurrences) {
    const primary = occurrences[0] ?? { file: 'convex/lib/ruleEvaluator.ts', offset: 0, defaultValue: false };
    const text = fs.readFileSync(path.join(root, primary.file), 'utf8');
    const line = text.slice(0, primary.offset).split('\n').length;
    const evidence = graph.addEvidence({
      tier: 'E0',
      source: `code:${primary.file}`,
      path: primary.file,
      symbol: code,
      line,
    });
    const id = `flag:${code}`;
    graph.addNode(
      {
        id,
        type: 'Flag',
        name: code,
        path: primary.file,
        purpose: `Controls ${humanize(code).toLowerCase()} through a boolean business-rule fallback.`,
        domain: code.includes('TENANCY') ? 'tenancy' : code.includes('ENTITLEMENT') ? 'entitlements' : 'mandates',
        attributes: {
          defaultValue: primary.defaultValue ?? false,
          runtimeValue: 'UNKNOWN',
          occurrenceCount: occurrences.length,
        },
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-convex', id, evidence);
  }
  for (const feature of features) {
    const featureId = `feature:${feature.key}`;
    if (feature.console === 'platform') {
      graph.nodes.get(featureId).attributes.ungatedReason = 'Platform features are role-gated, not tenant-entitled.';
    } else if (feature.alwaysOn) {
      graph.nodes.get(featureId).attributes.ungatedReason = 'Core lending feature is always available to every tenant.';
    } else {
      graph.addEdge(
        {
          type: 'ENFORCED_BY',
          from: featureId,
          to: 'flag:ENTITLEMENT_ENFORCEMENT',
          purpose: `${feature.key} is commercially enforced only when entitlement enforcement is enabled.`,
        },
        [feature.evidence]
      );
    }
  }

  const schemaEvidence = graph.nodes.get('table:userRoles')?.evidenceRefs[0];
  const platformEvidence = graph.nodes.get('table:platformAdmins')?.evidenceRefs[0] ?? schemaEvidence;
  const roles = [
    ['tenant', 'client', true, 'client', 'Borrower role with access to authenticated client workflows.', schemaEvidence],
    ['tenant', 'loan_officer', true, 'backoffice', 'Tenant staff role permitted to operate backoffice lending workflows.', schemaEvidence],
    ['tenant', 'admin', true, 'backoffice', 'Legacy tenant administrator role retained during the additive tenancy transition.', schemaEvidence],
    ['tenant', 'tenant_admin', true, 'backoffice', 'Tenant administrator role for institution-scoped management operations.', schemaEvidence],
    ['platform', 'platform_support', true, 'platform', 'Read-oriented platform support role with audited tenant access.', platformEvidence],
    ['platform', 'platform_owner', true, 'platform', 'Platform control-plane owner role permitted to manage tenants, plans, and guardrails.', platformEvidence],
  ];
  for (const [plane, name, assignable, console, purpose, evidence] of roles) {
    const id = `role:${plane}:${name}`;
    graph.addNode(
      {
        id,
        type: 'Role',
        name,
        path: plane === 'tenant' ? 'convex/schema.ts#userRoles' : 'convex/schema.ts#platformAdmins',
        purpose,
        domain: 'auth',
        attributes: { plane, assignable, console, aliases: [humanize(name)] },
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-convex', id, evidence);
  }
  return { features, plans, flags: [...flagOccurrences.keys()] };
}

function validatorIdMap(object, sf) {
  const result = new Map();
  if (!object || !ts.isObjectLiteralExpression(object)) return result;
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const match = property.initializer.getText(sf).match(/v\.id\(['"]([^'"]+)['"]\)/);
    if (match) result.set(propertyName(property, sf), match[1]);
  }
  return result;
}

function matchAll(text, pattern) {
  const results = [];
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(text))) results.push(match);
  return results;
}

function allowedRoleIdsForGuard(guard) {
  const map = {
    assertAuthenticated: ['access-policy:authenticated'],
    assertOwner: ['role:tenant:client', 'role:tenant:loan_officer', 'role:tenant:admin', 'role:tenant:tenant_admin'],
    assertOwnerOrStaff: ['role:tenant:client', 'role:tenant:loan_officer', 'role:tenant:admin', 'role:tenant:tenant_admin'],
    assertOwnerOrTenantStaff: ['role:tenant:client', 'role:tenant:loan_officer', 'role:tenant:admin', 'role:tenant:tenant_admin'],
    assertStaff: ['role:tenant:loan_officer', 'role:tenant:admin', 'role:tenant:tenant_admin'],
    assertTenantStaff: ['role:tenant:loan_officer', 'role:tenant:admin', 'role:tenant:tenant_admin'],
    assertAdmin: ['role:tenant:admin', 'role:tenant:tenant_admin'],
    assertTenantAdmin: ['role:tenant:admin', 'role:tenant:tenant_admin'],
    assertPlatformSupport: ['role:platform:platform_support', 'role:platform:platform_owner'],
    assertPlatformOwner: ['role:platform:platform_owner'],
    assertStaffOrPlatformSupport: [
      'role:tenant:loan_officer', 'role:tenant:admin', 'role:tenant:tenant_admin',
      'role:platform:platform_support', 'role:platform:platform_owner'
    ],
    assertAdminOrPlatformOwner: ['role:tenant:admin', 'role:tenant:tenant_admin', 'role:platform:platform_owner'],
  };
  return map[guard] ?? [];
}

function foldTransitiveHelperEffects(graph, root, files, records) {
  const convexFiles = files.filter((file) =>
    file.startsWith('convex/') && file.endsWith('.ts') && !TEST_FILE_RE.test(file) && !file.includes('/_generated/')
  );
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  const config = configPath ? ts.readConfigFile(configPath, ts.sys.readFile).config : {};
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
  const program = ts.createProgram({
    rootNames: convexFiles.map((file) => path.join(root, file)),
    options: { ...parsed.options, noEmit: true, skipLibCheck: true },
  });
  const checker = program.getTypeChecker();
  const sourceByFile = new Map();
  for (const sf of program.getSourceFiles()) {
    const relative = path.relative(root, sf.fileName).replaceAll('\\', '/');
    if (convexFiles.includes(relative)) sourceByFile.set(relative, sf);
  }

  const exportedDeclaration = (record) => {
    const sf = sourceByFile.get(record.file);
    if (!sf) return undefined;
    for (const statement of sf.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === graph.nodes.get(record.id)?.name) return declaration;
      }
    }
    return undefined;
  };

  const callableRoot = (declaration) => {
    if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return declaration;
    if (ts.isVariableDeclaration(declaration)) return declaration.initializer ? declaration : undefined;
    if (ts.isPropertyAssignment(declaration)) return declaration.initializer ? declaration : undefined;
    return undefined;
  };

  for (const record of records) {
    const start = exportedDeclaration(record);
    if (!start) continue;
    const visited = new Set();
    const helperTexts = [];
    const helperEvidence = [];
    const helperSymbols = [];
    const visitDeclaration = (declaration, isStart = false) => {
      const sf = declaration.getSourceFile();
      const relative = path.relative(root, sf.fileName).replaceAll('\\', '/');
      const key = `${relative}:${declaration.pos}:${declaration.end}`;
      if (visited.has(key)) return;
      visited.add(key);
      if (!isStart) {
        helperTexts.push(declaration.getText(sf));
        const symbolName = declaration.name?.getText(sf) ?? '<anonymous-helper>';
        helperSymbols.push(`${relative}#${symbolName}`);
        helperEvidence.push(evidenceFor(graph, relative, sf, declaration, symbolName));
      }
      const visitCalls = (node) => {
        if (ts.isCallExpression(node)) {
          const location = ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression;
          let symbol = checker.getSymbolAtLocation(location);
          if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) {
            try {
              symbol = checker.getAliasedSymbol(symbol);
            } catch {
              symbol = undefined;
            }
          }
          for (const rawDeclaration of symbol?.declarations ?? []) {
            const candidate = callableRoot(rawDeclaration);
            if (!candidate) continue;
            const candidateFile = path.relative(root, candidate.getSourceFile().fileName).replaceAll('\\', '/');
            if (!convexFiles.includes(candidateFile)) continue;
            visitDeclaration(candidate);
          }
        }
        ts.forEachChild(node, visitCalls);
      };
      visitCalls(declaration);
    };
    visitDeclaration(start, true);
    record.transitiveText = [record.initializer.getText(record.sf), ...helperTexts].join('\n');
    record.transitiveEvidenceRefs = [...new Set([record.evidence, ...helperEvidence])];
    record.helperSymbols = [...new Set(helperSymbols)].sort();
  }
}

function analyzeFunctionEffects(record, graph) {
  const { id, file, sf, initializer, object, evidence, argsIds } = record;
  const text = record.transitiveText ?? initializer.getText(sf);
  const effectEvidence = record.transitiveEvidenceRefs ?? [evidence];
  const addEffectEdge = (edge) => graph.addEdge(edge, effectEvidence);
  const reads = new Set(matchAll(text, /(?:ctx\.)?db\.query\(['"]([^'"]+)['"]\)/g).map((match) => match[1]));
  const writes = new Set(matchAll(text, /(?:ctx\.)?db\.insert\(['"]([^'"]+)['"]/g).map((match) => match[1]));
  for (const match of matchAll(text, /(?:ctx\.)?db\.(?:get|patch|delete|replace)\((?:args\.)?([A-Za-z0-9_]+)/g)) {
    const table = argsIds.get(match[1]);
    if (!table) continue;
    if (text.slice(Math.max(0, match.index - 20), match.index + 40).includes('.get(')) reads.add(table);
    else writes.add(table);
  }
  if (/scheduleAudit(?:Log|Entry)?\s*\(/.test(text)) {
    writes.add('auditLogs');
    writes.add('eventJournal');
  }
  if (/emit(?:Domain)?Event\s*\(/.test(text)) writes.add('eventJournal');
  if (/emitRelationship\s*\(/.test(text)) writes.add('relationships');
  if (/enqueueOutboxIdempotent\s*\(/.test(text)) writes.add('tigerBeetleOutbox');
  for (const table of reads) {
    if (!graph.nodes.has(`table:${table}`)) continue;
    addEffectEdge({ type: 'READS', from: id, to: `table:${table}`, purpose: `${id} reads ${table}.` });
  }
  for (const table of writes) {
    if (!graph.nodes.has(`table:${table}`)) continue;
    addEffectEdge({ type: 'WRITES', from: id, to: `table:${table}`, purpose: `${id} writes ${table}.` });
  }
  const indexes = matchAll(text, /\.withIndex\(['"]([^'"]+)['"]/g).map((match) => match[1]);
  for (const indexName of indexes) {
    const matching = [...graph.nodes.values()].find((node) => node.type === 'Index' && node.name === indexName && reads.has(node.attributes.table));
    if (matching) {
      addEffectEdge({ type: 'USES_INDEX', from: id, to: matching.id, purpose: `${id} queries through ${matching.id}.` });
    }
  }
  const guards = new Set(matchAll(text, /\b(assert[A-Z][A-Za-z0-9]+)\s*\(/g).map((match) => match[1]));
  for (const guard of guards) {
    for (const target of allowedRoleIdsForGuard(guard)) {
      if (!graph.nodes.has(target)) continue;
      addEffectEdge(
        { type: 'GATED_BY', from: id, to: target, purpose: `${id} is admitted by ${guard} for ${target}.`, attributes: { guard } },
      );
    }
  }
  for (const match of matchAll(text, /assertCallerFeatureEnabled\s*\([^,]+,\s*['"]([^'"]+)['"]\)/g)) {
    const featureId = `feature:${match[1]}`;
    if (graph.nodes.has(featureId)) {
      addEffectEdge({ type: 'DEPENDS_ON', from: id, to: featureId, purpose: `${id} requires the ${match[1]} feature.` });
      addEffectEdge({ type: 'GATED_BY', from: id, to: 'flag:ENTITLEMENT_ENFORCEMENT', purpose: `${id} is blocked by entitlement enforcement when unentitled.` });
    }
  }
  for (const flag of [...graph.nodes.values()].filter((node) => node.type === 'Flag')) {
    if (!text.includes(flag.name)) continue;
    addEffectEdge(
      {
        type: 'GATED_BY',
        from: id,
        to: flag.id,
        purpose: `${id} evaluates the ${flag.name} business-rule flag.`,
        attributes: { ruleCode: flag.name },
      },
    );
  }
  for (const match of matchAll(text, /(?:api|internal)\.([A-Za-z0-9_.]+)/g)) {
    const target = functionIdFromApiReference(match[1]);
    if (target && target !== id && graph.nodes.has(target)) {
      addEffectEdge({ type: 'CALLS', from: id, to: target, purpose: `${id} calls ${target}.` });
    }
  }
  if (/enqueueOutboxIdempotent\s*\(/.test(text) && graph.nodes.has('external:tigerbeetle')) {
    addEffectEdge({ type: 'POSTS_TO', from: id, to: 'external:tigerbeetle', purpose: `${id} emits a ledger posting intent through the TigerBeetle outbox.` });
  }
  if (/tigerbeetle/i.test(file) && /(TIGERBEETLE_HTTP_URL|TB_BASE_URL)/.test(text) && /fetch\s*\(/.test(text)) {
    addEffectEdge({ type: 'CALLS_ENDPOINT', from: id, to: 'endpoint:POST:external:tigerbeetle:/transfers', purpose: `${id} calls the configured TigerBeetle transfer endpoint.` });
  }
  if (/ips|ipp/i.test(file) && /(initiate|transfer|settle|callback|webhook)/i.test(text) && graph.nodes.has('external:namibia-ips')) {
    addEffectEdge({ type: 'SETTLES_VIA', from: id, to: 'external:namibia-ips', purpose: `${id} participates in an IPS/IPP transaction path.` });
  }
  if (/ips/i.test(file) && /(sendIpsXml\s*\(|IPS_BASE_URL)/.test(text) && /fetch\s*\(/.test(text)) {
    addEffectEdge({ type: 'CALLS_ENDPOINT', from: id, to: 'endpoint:POST:external:namibia-ips:/xml', purpose: `${id} exchanges protocol messages with the IPS XML endpoint.` });
  }
  if (/sendSms|AFRICASTALKING/.test(text) && graph.nodes.has('external:africas-talking')) {
    addEffectEdge({ type: 'NOTIFIES_VIA', from: id, to: 'external:africas-talking', purpose: `${id} sends SMS through Africa's Talking.` });
  }
  if (/sendSms/i.test(file) && /AT_API_URL/.test(text) && /fetch\s*\(/.test(text)) {
    addEffectEdge({ type: 'CALLS_ENDPOINT', from: id, to: 'endpoint:POST:external:africas-talking:/messaging', purpose: `${id} calls the Africa's Talking messaging endpoint.` });
  }
  if (/sendWhatsapp|WHATSAPP/.test(text) && graph.nodes.has('external:whatsapp-cloud')) {
    addEffectEdge({ type: 'NOTIFIES_VIA', from: id, to: 'external:whatsapp-cloud', purpose: `${id} sends WhatsApp messages through the Meta Cloud API.` });
  }
  if (/sendWhatsapp/i.test(file) && /WA_BASE_URL/.test(text) && /fetch\s*\(/.test(text)) {
    addEffectEdge({ type: 'CALLS_ENDPOINT', from: id, to: 'endpoint:POST:external:whatsapp-cloud:/messages', purpose: `${id} calls the WhatsApp Cloud messages endpoint.` });
  }
  const node = graph.nodes.get(id);
  node.attributes.helperSymbols = record.helperSymbols ?? [];
  node.attributes.sideEffects = [...graph.edges.values()]
    .filter((edge) => edge.from === id && ['READS', 'WRITES', 'POSTS_TO', 'SETTLES_VIA', 'NOTIFIES_VIA', 'CALLS'].includes(edge.type))
    .map((edge) => `${edge.type}:${edge.to}`)
    .sort();
}

export function extractConvexFunctions(graph, root, files) {
  const records = [];
  for (const file of files.filter((candidate) => candidate.startsWith('convex/') && candidate.endsWith('.ts') && !TEST_FILE_RE.test(candidate) && !candidate.includes('/_generated/'))) {
    const sf = sourceFile(root, file, ts.ScriptKind.TS);
    for (const statement of sf.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const exported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        const initializer = unwrap(declaration.initializer);
        if (!ts.isCallExpression(initializer)) continue;
        const wrapper = ts.isIdentifier(initializer.expression)
          ? initializer.expression.text
          : ts.isPropertyAccessExpression(initializer.expression)
            ? initializer.expression.name.text
            : '';
        if (!CONVEX_WRAPPERS.has(wrapper)) continue;
        const object = unwrap(initializer.arguments[0]);
        if (!object || !ts.isObjectLiteralExpression(object)) continue;
        const argsProperty = objectProperty(object, 'args', sf);
        const returnsProperty = objectProperty(object, 'returns', sf);
        const argsExpression = unwrap(argsProperty?.initializer);
        const name = declaration.name.text;
        const modulePath = file.replace(/^convex\//, '').replace(/\.ts$/, '');
        const id = `function:convex:${modulePath}.${name}`;
        const evidence = evidenceFor(graph, file, sf, statement, name);
        const purpose = jsDocText(ts, sf, statement) || `${humanize(wrapper)} ${name} exposed by the ${modulePath} Convex module.`;
        graph.addNode(
          {
            id,
            type: 'Function',
            name,
            path: file,
            purpose,
            domain: domainFromPath(file),
            attributes: {
              kind: wrapper,
              visibility: wrapper.startsWith('internal') ? 'internal' : 'public',
              args: argsProperty ? argsProperty.initializer.getText(sf) : '{}',
              returns: returnsProperty ? returnsProperty.initializer.getText(sf) : 'NOT_STATED',
              sideEffects: [],
            },
          },
          [evidence]
        );
        addContainment(graph, 'system:namlend-convex', id, evidence);
        records.push({
          id,
          file,
          sf,
          initializer,
          object,
          evidence,
          argsIds: validatorIdMap(argsExpression, sf),
        });
      }
    }
  }
  foldTransitiveHelperEffects(graph, root, files, records);
  for (const record of records) analyzeFunctionEffects(record, graph);
  return records;
}

function addExternal(graph, definition) {
  const text = fs.readFileSync(path.join(graph.root, definition.path), 'utf8');
  const line = Math.max(1, text.slice(0, Math.max(0, text.indexOf(definition.anchor))).split('\n').length);
  const evidence = graph.addEvidence({
    tier: 'E0',
    source: `code:${definition.path}`,
    path: definition.path,
    symbol: definition.anchor,
    line,
  });
  graph.addNode(
    {
      id: definition.id,
      type: 'ExternalSystem',
      name: definition.name,
      path: definition.interface,
      purpose: definition.purpose,
      domain: definition.domain,
      attributes: { interface: definition.interface, direction: definition.direction, proofBoundary: definition.proofBoundary },
    },
    [evidence]
  );
  return evidence;
}

export function extractExternalSystems(graph) {
  const definitions = [
    {
      id: 'external:tigerbeetle', name: 'TigerBeetle ledger', path: 'convex/scheduled/tigerBeetleOutboxWorker.ts',
      anchor: 'TIGERBEETLE_HTTP_URL', interface: 'TIGERBEETLE_HTTP_URL', domain: 'ledger', direction: 'outbound',
      purpose: 'Receives idempotent double-entry transfer postings from the Convex outbox worker.',
      proofBoundary: 'Code and tests can prove outbox intent; live cluster acceptance requires provider/runtime evidence.'
    },
    {
      id: 'external:namibia-ips', name: 'Namibia IPS/IPP', path: 'convex/actions/ipsAdapter.ts',
      anchor: 'IPS_BASE_URL', interface: 'https://ips.bon.na/api/v2/xml', domain: 'ips', direction: 'bidirectional',
      purpose: 'Processes Namibia instant-payment onboarding, transfers, callbacks, and settlement-related status.',
      proofBoundary: 'Application handling is distinct from proof that external bank funds settled.'
    },
    {
      id: 'external:africas-talking', name: "Africa's Talking SMS", path: 'convex/actions/sendSms.ts',
      anchor: 'AT_API_URL', interface: 'https://api.africastalking.com/version1/messaging', domain: 'notifications', direction: 'outbound',
      purpose: 'Delivers queued SMS notifications when production credentials are configured.',
      proofBoundary: 'Queueing and HTTP handling do not prove handset delivery.'
    },
    {
      id: 'external:whatsapp-cloud', name: 'WhatsApp Cloud API', path: 'convex/actions/sendWhatsapp.ts',
      anchor: 'WA_BASE_URL', interface: 'https://graph.facebook.com/{version}/{phone-number-id}/messages', domain: 'notifications', direction: 'outbound',
      purpose: 'Delivers queued WhatsApp notifications through the Meta Cloud API.',
      proofBoundary: 'Queueing and provider acknowledgement do not prove recipient reading.'
    },
    {
      id: 'external:sentry', name: 'Sentry', path: 'src/utils/sentry.ts',
      anchor: 'Sentry.init', interface: '@sentry/react', domain: 'observability', direction: 'outbound',
      purpose: 'Receives frontend exception and diagnostic events when a DSN is configured.',
      proofBoundary: 'The SDK call does not prove production project configuration.'
    },
    {
      id: 'external:supabase-legacy', name: 'Supabase legacy runtime island', path: 'src/integrations/supabase/client.ts',
      anchor: 'VITE_SUPABASE_URL', interface: 'VITE_SUPABASE_URL', domain: 'legacy', direction: 'bidirectional',
      purpose: 'Supports selected migration-debt frontend paths retained from the pre-Convex backend.',
      proofBoundary: 'Supabase is not the source of truth for new application behavior.'
    },
    {
      id: 'external:convex-auth', name: 'Convex Auth package', path: 'convex/auth.ts',
      anchor: 'convexAuth', interface: '@convex-dev/auth', domain: 'auth', direction: 'bidirectional',
      purpose: 'Provides password authentication, session storage, generated auth tables, and mounted HTTP routes.',
      proofBoundary: 'Repository wiring proves configuration; production identity availability requires runtime evidence.'
    },
  ];
  const endpointDefs = [
    ['endpoint:POST:external:tigerbeetle:/transfers', 'POST TigerBeetle transfers', 'TIGERBEETLE_HTTP_URL/transfers', 'external:tigerbeetle'],
    ['endpoint:POST:external:namibia-ips:/xml', 'POST IPS XML messages', 'https://ips.bon.na/api/v2/xml', 'external:namibia-ips'],
    ['endpoint:POST:external:africas-talking:/messaging', 'POST SMS messages', 'https://api.africastalking.com/version1/messaging', 'external:africas-talking'],
    ['endpoint:POST:external:whatsapp-cloud:/messages', 'POST WhatsApp messages', 'https://graph.facebook.com/{version}/{phone-number-id}/messages', 'external:whatsapp-cloud'],
    ['endpoint:SDK:external:sentry', 'Sentry SDK ingestion', '@sentry/react', 'external:sentry'],
    ['endpoint:SDK:external:supabase', 'Supabase JavaScript client', '@supabase/supabase-js', 'external:supabase-legacy'],
    ['endpoint:SDK:external:convex-auth', 'Convex Auth package interface', '@convex-dev/auth', 'external:convex-auth'],
  ];
  const evidenceByExternal = new Map();
  for (const definition of definitions) evidenceByExternal.set(definition.id, addExternal(graph, definition));
  for (const [id, name, endpointPath, owner] of endpointDefs) {
    const evidence = evidenceByExternal.get(owner);
    graph.addNode(
      {
        id,
        type: 'Endpoint',
        name,
        path: endpointPath,
        purpose: `Provides the external interface used by ${graph.nodes.get(owner).name}.`,
        domain: graph.nodes.get(owner).domain,
        attributes: { external: true },
      },
      [evidence]
    );
    graph.addEdge({ type: 'OWNED_BY', from: id, to: owner, purpose: `${id} is owned by ${owner}.` }, [evidence]);
  }
  graph.addEdge(
    { type: 'CALLS_ENDPOINT', from: 'system:namlend-web', to: 'endpoint:SDK:external:sentry', purpose: 'The web application initializes and calls the Sentry SDK when configured.' },
    [evidenceByExternal.get('external:sentry')]
  );
  graph.addEdge(
    { type: 'CALLS_ENDPOINT', from: 'system:namlend-web', to: 'endpoint:SDK:external:supabase', purpose: 'Selected active migration-debt paths still call the legacy Supabase JavaScript client.' },
    [evidenceByExternal.get('external:supabase-legacy')]
  );
}

function resolveModuleFile(root, importer, specifier, trackedSet) {
  let base;
  if (specifier.startsWith('@/')) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  else return undefined;
  const candidates = [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`];
  return candidates.find((candidate) => trackedSet.has(candidate));
}

function collectComponents(root, files) {
  const componentFiles = files.filter(
    (file) => file.startsWith('src/') && file.endsWith('.tsx') && !TEST_FILE_RE.test(file) && !file.includes('/tests/')
  );
  const records = [];
  const defaultByFile = new Map();
  const byFileAndName = new Map();
  for (const file of componentFiles) {
    const sf = sourceFile(root, file, ts.ScriptKind.TSX);
    const declarations = new Map();
    for (const statement of sf.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name && /^[A-Z]/.test(statement.name.text)) {
        declarations.set(statement.name.text, statement);
      }
      if (ts.isClassDeclaration(statement) && statement.name && /^[A-Z]/.test(statement.name.text)) {
        declarations.set(statement.name.text, statement);
      }
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !/^[A-Z]/.test(declaration.name.text) || !declaration.initializer) continue;
          const text = declaration.initializer.getText(sf);
          if (/React\.lazy\s*\(/.test(text)) continue;
          if (ts.isArrowFunction(unwrap(declaration.initializer)) || ts.isFunctionExpression(unwrap(declaration.initializer))) {
            declarations.set(declaration.name.text, declaration);
          }
        }
      }
    }
    let defaultName = [...declarations.entries()].find(([, declaration]) =>
      declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    )?.[0];
    for (const statement of sf.statements) {
      if (!ts.isExportAssignment(statement)) continue;
      const expression = unwrap(statement.expression);
      if (ts.isIdentifier(expression)) defaultName = expression.text;
      else if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
        defaultName = path.posix.basename(file, '.tsx');
        declarations.set(defaultName, statement);
      }
    }
    for (const [name, declaration] of declarations) {
      const id = `component:${file}#${name}`;
      byFileAndName.set(`${file}#${name}`, id);
      if (name === defaultName) defaultByFile.set(file, id);
      records.push({ file, sf, name, declaration, id, isDefault: name === defaultName });
    }
    if (defaultName && !defaultByFile.has(file)) {
      const id = `component:${file}#${defaultName}`;
      defaultByFile.set(file, id);
    }
  }
  return { records, defaultByFile, byFileAndName, componentFiles };
}

function routeGateTargets(elementText, inherited) {
  if (/requirePlatformOwner/.test(elementText)) return ['role:platform:platform_owner'];
  if (/requirePlatform/.test(elementText) || inherited === 'platform') {
    return ['role:platform:platform_support', 'role:platform:platform_owner'];
  }
  if (/requireAdmin/.test(elementText) || /<AdminOnly/.test(elementText)) {
    return ['role:tenant:admin', 'role:tenant:tenant_admin'];
  }
  if (/requireLoanOfficer/.test(elementText) || inherited === 'admin') {
    return ['role:tenant:loan_officer', 'role:tenant:admin', 'role:tenant:tenant_admin'];
  }
  if (/<ProtectedRoute/.test(elementText)) return ['access-policy:authenticated'];
  return ['access-policy:public'];
}

function findJsxRoutes(sf) {
  const routes = [];
  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sf) === 'Route') routes.push(node);
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sf) === 'Route') routes.push(node.openingElement);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return routes;
}

function jsxAttribute(opening, name) {
  return opening.attributes.properties.find(
    (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === name
  );
}

export function extractComponentsAndRoutes(graph, root, files) {
  const trackedSet = new Set(files);
  const collected = collectComponents(root, files);
  const moduleInfo = new Map();
  for (const file of collected.componentFiles) {
    const sf = sourceFile(root, file, ts.ScriptKind.TSX);
    const imports = new Map();
    const lazy = new Map();
    for (const statement of sf.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const targetFile = resolveModuleFile(root, file, statement.moduleSpecifier.text, trackedSet);
        if (!targetFile || !statement.importClause) continue;
        if (statement.importClause.name) imports.set(statement.importClause.name.text, collected.defaultByFile.get(targetFile));
        const bindings = statement.importClause.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            const importedName = element.propertyName?.text ?? element.name.text;
            imports.set(element.name.text, collected.byFileAndName.get(`${targetFile}#${importedName}`));
          }
        }
      }
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
          const match = declaration.initializer.getText(sf).match(/React\.lazy\s*\(\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/);
          if (!match) continue;
          const targetFile = resolveModuleFile(root, file, match[1], trackedSet);
          if (targetFile) lazy.set(declaration.name.text, collected.defaultByFile.get(targetFile));
        }
      }
    }
    moduleInfo.set(file, { sf, imports, lazy });
  }
  for (const record of collected.records) {
    const evidence = evidenceFor(graph, record.file, record.sf, record.declaration, record.name);
    const purpose = jsDocText(ts, record.sf, record.declaration) || `Renders the ${humanize(record.name).toLowerCase()} React interface.`;
    graph.addNode(
      {
        id: record.id,
        type: 'Component',
        name: record.name,
        path: record.file,
        purpose,
        domain: domainFromPath(record.file),
        attributes: { defaultExport: record.isDefault },
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-web', record.id, evidence);
    const text = record.declaration.getText(record.sf);
    const module = moduleInfo.get(record.file);
    for (const match of matchAll(text, /<([A-Z][A-Za-z0-9_.]*)\b/g)) {
      const name = match[1].split('.')[0];
      const target =
        collected.byFileAndName.get(`${record.file}#${name}`) ?? module.imports.get(name) ?? module.lazy.get(name);
      if (target && target !== record.id && graph.nodes.has(target)) {
        graph.addEdge({ type: 'RENDERS', from: record.id, to: target, purpose: `${record.name} renders ${graph.nodes.get(target).name}.` }, [evidence]);
      }
    }
    for (const match of matchAll(text, /(?:api|internal)\.([A-Za-z0-9_.]+)/g)) {
      const target = functionIdFromApiReference(match[1]);
      if (target && graph.nodes.has(target)) {
        graph.addEdge({ type: 'INVOKES', from: record.id, to: target, purpose: `${record.name} invokes ${target} through a Convex hook or client call.` }, [evidence]);
      }
    }
  }

  const routeFiles = [
    ['src/App.tsx', '', undefined],
    ['src/pages/AdminDashboard/adminRoutes.tsx', '/admin', 'admin'],
    ['src/pages/PlatformConsole/platformRoutes.tsx', '/platform', 'platform'],
  ];
  const routeResults = [];
  for (const [file, prefix, inherited] of routeFiles) {
    const module = moduleInfo.get(file) ?? { sf: sourceFile(root, file, ts.ScriptKind.TSX), imports: new Map(), lazy: new Map() };
    for (const opening of findJsxRoutes(module.sf)) {
      const pathAttribute = jsxAttribute(opening, 'path');
      const indexAttribute = jsxAttribute(opening, 'index');
      if (!pathAttribute && indexAttribute) continue;
      let routePath;
      if (pathAttribute?.initializer && ts.isStringLiteral(pathAttribute.initializer)) routePath = pathAttribute.initializer.text;
      if (!routePath) continue;
      const fullPath = routePath.startsWith('/') || routePath === '*' ? routePath : `${prefix}/${routePath}`.replace(/\/+/g, '/');
      const elementAttribute = jsxAttribute(opening, 'element');
      const elementText = elementAttribute?.initializer?.getText(module.sf) ?? opening.getText(module.sf);
      const names = matchAll(elementText, /<([A-Z][A-Za-z0-9]*)\b/g)
        .map((match) => match[1])
        .filter((name) => !['ProtectedRoute', 'AdminOnly', 'PageSuspense', 'Navigate'].includes(name));
      const targetName = names.at(-1);
      const target = targetName
        ? module.lazy.get(targetName) ?? module.imports.get(targetName) ?? collected.byFileAndName.get(`${file}#${targetName}`)
        : undefined;
      const evidence = evidenceFor(graph, file, module.sf, opening, fullPath);
      const routeId = `route:${fullPath}`;
      graph.addNode(
        {
          id: routeId,
          type: 'Route',
          name: fullPath,
          path: fullPath,
          purpose: target ? `Routes ${fullPath} to ${graph.nodes.get(target)?.name ?? targetName}.` : `Resolves the ${fullPath} frontend route.`,
          domain: domainFromPath(fullPath),
          attributes: { authGate: routeGateTargets(elementText, inherited), sourceFile: file },
        },
        [evidence]
      );
      addContainment(graph, 'system:namlend-web', routeId, evidence);
      if (target && graph.nodes.has(target)) {
        graph.addEdge({ type: 'ROUTES_TO', from: routeId, to: target, purpose: `${fullPath} resolves to ${graph.nodes.get(target).name}.` }, [evidence]);
      } else {
        graph.addGap({
          kind: 'ROUTE_TARGET_UNKNOWN', subjectId: routeId, summary: `No component target was resolved for ${fullPath}.`,
          evidenceRefs: [evidence], nextAction: 'Add an explicit route-to-component override or simplify the route expression.'
        });
      }
      for (const gateTarget of routeGateTargets(elementText, inherited)) {
        if (!graph.nodes.has(gateTarget)) continue;
        graph.addEdge({ type: 'GATED_BY', from: routeId, to: gateTarget, purpose: `${fullPath} is gated by ${graph.nodes.get(gateTarget).name}.` }, [evidence]);
      }
      routeResults.push({ id: routeId, path: fullPath, evidence });
    }
  }
  return { ...collected, routes: routeResults };
}

export function extractHttpAndSchedules(graph, root) {
  const httpFile = 'convex/http.ts';
  const httpSf = sourceFile(root, httpFile, ts.ScriptKind.TS);
  const routeCalls = [];
  const visitHttp = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.getText(httpSf) === 'http.route'
    ) routeCalls.push(node);
    ts.forEachChild(node, visitHttp);
  };
  visitHttp(httpSf);
  for (const call of routeCalls) {
    const object = unwrap(call.arguments[0]);
    if (!object || !ts.isObjectLiteralExpression(object)) continue;
    const routePath = literal(objectProperty(object, 'path', httpSf)?.initializer, httpSf);
    const method = literal(objectProperty(object, 'method', httpSf)?.initializer, httpSf);
    if (!routePath || !method) continue;
    const evidence = evidenceFor(graph, httpFile, httpSf, call, `${method} ${routePath}`);
    const endpointId = `endpoint:${method}:${routePath}`;
    const handlerId = `function:convex:http.${method}-${safeIdPart(routePath)}`;
    graph.addNode(
      {
        id: endpointId,
        type: 'Endpoint',
        name: `${method} ${routePath}`,
        path: routePath,
        purpose: `Exposes the ${method} ${routePath} Convex HTTP interface.`,
        domain: domainFromPath(routePath),
        attributes: { method, inbound: true },
      },
      [evidence]
    );
    graph.addNode(
      {
        id: handlerId,
        type: 'Function',
        name: `${method} ${routePath} handler`,
        path: httpFile,
        purpose: `Handles requests received by ${method} ${routePath}.`,
        domain: domainFromPath(routePath),
        attributes: { kind: 'httpAction', visibility: 'public', args: 'HTTP Request', returns: 'HTTP Response' },
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-convex', endpointId, evidence);
    addContainment(graph, 'system:namlend-convex', handlerId, evidence);
    graph.addEdge({ type: 'HANDLED_BY', from: endpointId, to: handlerId, purpose: `${endpointId} is handled by ${handlerId}.` }, [evidence]);
    const text = call.getText(httpSf);
    for (const match of matchAll(text, /(?:api|internal)\.([A-Za-z0-9_.]+)/g)) {
      const target = functionIdFromApiReference(match[1]);
      if (target && graph.nodes.has(target)) {
        graph.addEdge({ type: 'CALLS', from: handlerId, to: target, purpose: `${handlerId} calls ${target}.` }, [evidence]);
      }
    }
    if (routePath.includes('/ips')) {
      graph.addEdge({ type: 'OWNED_BY', from: endpointId, to: 'external:namibia-ips', purpose: `${endpointId} receives IPS/IPP callbacks.` }, [evidence]);
    }
  }

  const authText = fs.readFileSync(path.join(root, httpFile), 'utf8');
  if (authText.includes('auth.addHttpRoutes(http)')) {
    const line = authText.slice(0, authText.indexOf('auth.addHttpRoutes(http)')).split('\n').length;
    const evidence = graph.addEvidence({ tier: 'E0', source: `code:${httpFile}`, path: httpFile, symbol: 'auth.addHttpRoutes', line });
    graph.addNode(
      {
        id: 'endpoint:*:/api/auth/*', type: 'Endpoint', name: 'Convex Auth HTTP routes', path: '/api/auth/*',
        purpose: 'Exposes the HTTP endpoints mounted by Convex Auth.', domain: 'auth', attributes: { method: '*', generatedByDependency: true }
      },
      [evidence]
    );
    addContainment(graph, 'system:namlend-convex', 'endpoint:*:/api/auth/*', evidence);
    graph.addEdge({
      type: 'OWNED_BY', from: 'endpoint:*:/api/auth/*', to: 'external:convex-auth',
      purpose: 'Convex Auth mounts and handles the generated authentication HTTP routes.'
    }, [evidence]);
  }

  const cronFile = 'convex/crons.ts';
  const cronSf = sourceFile(root, cronFile, ts.ScriptKind.TS);
  const visitCron = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(cronSf) === 'crons' &&
      ['interval', 'daily', 'weekly', 'monthly', 'cron'].includes(node.expression.name.text)
    ) {
      const name = literal(node.arguments[0], cronSf);
      if (!name) return;
      const schedule = node.arguments[1]?.getText(cronSf) ?? 'NOT_STATED';
      const targetText = node.arguments[2]?.getText(cronSf) ?? '';
      const match = targetText.match(/internal\.([A-Za-z0-9_.]+)/);
      const target = match ? functionIdFromApiReference(match[1]) : undefined;
      const evidence = evidenceFor(graph, cronFile, cronSf, node, name);
      const id = `schedule:${name}`;
      graph.addNode(
        {
          id, type: 'Schedule', name, path: cronFile,
          purpose: `Runs ${target ?? 'a Convex internal function'} on the ${schedule} schedule.`,
          domain: domainFromPath(targetText), attributes: { schedule, target }
        },
        [evidence]
      );
      addContainment(graph, 'system:namlend-convex', id, evidence);
      if (target && graph.nodes.has(target)) {
        graph.addEdge({ type: 'SCHEDULES', from: id, to: target, purpose: `${name} schedules ${target}.` }, [evidence]);
      }
    }
    ts.forEachChild(node, visitCron);
  };
  visitCron(cronSf);
}

function testSuite(file) {
  if (file.startsWith('convex/')) return 'convex';
  if (file.startsWith('e2e/')) return 'e2e';
  if (file.startsWith('ontology/')) return 'ontology';
  return 'unit';
}

function callName(call, sf) {
  const expression = call.expression;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.getText(sf);
  if (ts.isCallExpression(expression)) return `${callName(expression, sf)}()`;
  return expression.getText(sf);
}

function isTestDeclaration(call, sf) {
  const name = callName(call, sf);
  const title = literal(call.arguments[0], sf);
  const callback = call.arguments.find((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));
  return (
    typeof title === 'string' &&
    Boolean(callback) &&
    (/^(?:it|test)(?:\.(?:skip|todo|fixme|only|concurrent))?$/.test(name) || /^(?:it|test)\.each\(\)$/.test(name))
  );
}

export function extractTests(graph, root, files, componentData) {
  const tests = [];
  const skipSites = [];
  for (const file of files.filter((candidate) => TEST_FILE_RE.test(candidate) && (candidate.startsWith('src/') || candidate.startsWith('convex/') || candidate.startsWith('e2e/') || candidate.startsWith('ontology/')))) {
    const sf = sourceFile(root, file, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const suite = testSuite(file);
    const text = sf.getFullText();
    const suiteIdentity = (context) => `describe:${suite}:${file}#${stableHash(context.join(' > ') || '<root>', 20)}`;
    const visit = (node, context = [], activeTestId) => {
      if (ts.isCallExpression(node)) {
        const name = callName(node, sf);
        const isDescribe = /^(?:describe|test\.describe)(?:\.(?:serial|parallel|skip|only))?$/.test(name);
        const first = node.arguments[0];
        const title = literal(first, sf) ?? (first ? first.getText(sf).slice(0, 120) : undefined);
        if (isDescribe && title) {
          const callback = node.arguments.find((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));
          if (callback) {
            const nextContext = [...context, String(title)];
            if (/\.skip$/.test(name)) {
              const source = node.getText(sf);
              const skipId = `skip:${file}#${stableHash(source.replace(/\s+/g, ' '), 16)}`;
              skipSites.push({
                id: skipId, file, line: lineOf(sf, node), testId: suiteIdentity(nextContext),
                reason: `Declared with ${name}.`, evidence: evidenceFor(graph, file, sf, node, skipId),
              });
            }
            visit(callback.body, nextContext, undefined);
            return;
          }
        }
        if (isTestDeclaration(node, sf) && title) {
          const fullTitle = [...context, String(title)].join(' > ');
          const id = `test:${suite}:${file}#${stableHash(fullTitle, 20)}`;
          const evidence = evidenceFor(graph, file, sf, node, fullTitle);
          const declaredStatus = /\.(?:skip|todo|fixme)/.test(name) ? 'skipped' : 'active';
          graph.addNode(
            {
              id, type: 'Test', name: fullTitle, path: file,
              purpose: `Proves: ${fullTitle}.`, domain: domainFromPath(`${file} ${fullTitle}`),
              attributes: { suite, declaredStatus, line: lineOf(sf, node) }
            },
            [evidence]
          );
          addContainment(graph, 'system:namlend-tests', id, evidence);
          tests.push({ id, file, suite, title: fullTitle, node, evidence, text: node.getText(sf) });
          if (declaredStatus === 'skipped') {
            const skipId = `skip:${file}#${stableHash(node.getText(sf).replace(/\s+/g, ' '), 16)}`;
            skipSites.push({ id: skipId, file, line: lineOf(sf, node), testId: id, reason: `Declared with ${name}.`, evidence });
          }
          const callback = node.arguments.find((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));
          if (callback) visit(callback.body, context, id);
          return;
        }
        if (/^(?:test|it|test\.describe)\.skip$/.test(name) && !isTestDeclaration(node, sf)) {
          const source = node.getText(sf);
          const reason = literal(node.arguments.at(-1), sf) ?? 'Conditional runtime skip; reason is not a string literal.';
          const skipId = `skip:${file}#${stableHash(source.replace(/\s+/g, ' '), 16)}`;
          skipSites.push({
            id: skipId,
            file,
            line: lineOf(sf, node),
            testId: activeTestId ?? suiteIdentity(context),
            reason: String(reason),
            evidence: evidenceFor(graph, file, sf, node, skipId),
          });
        }
      }
      ts.forEachChild(node, (child) => visit(child, context, activeTestId));
    };
    visit(sf, []);

    for (const test of tests.filter((candidate) => candidate.file === file)) {
      for (const match of matchAll(test.text, /(?:api|internal)\.([A-Za-z0-9_.]+)/g)) {
        const target = functionIdFromApiReference(match[1]);
        if (target && graph.nodes.has(target)) {
          graph.addEdge({ type: 'TESTED_BY', from: target, to: test.id, purpose: `${test.title} exercises ${target}.` }, [test.evidence]);
        }
      }
      for (const match of matchAll(test.text, /(?:page\.goto|gotoAuthenticated)\([^,]*?['"]([^'"]+)['"]/g)) {
        const route = [...graph.nodes.values()].find((node) => node.type === 'Route' && node.path === match[1]);
        if (route) graph.addEdge({ type: 'TESTED_BY', from: route.id, to: test.id, purpose: `${test.title} exercises ${route.path}.` }, [test.evidence]);
      }
      for (const table of matchAll(test.text, /(?:query|insert)\(['"]([^'"]+)['"]/g).map((match) => match[1])) {
        if (graph.nodes.has(`table:${table}`)) {
          graph.addEdge({ type: 'TESTED_BY', from: `table:${table}`, to: test.id, purpose: `${test.title} uses ${table}.` }, [test.evidence]);
        }
      }
    }
  }

  for (const component of componentData.records) {
    const importedBy = tests.filter((test) => {
      if (!test.file.startsWith('src/')) return false;
      const relative = path.posix.relative(path.posix.dirname(test.file), component.file).replace(/\.(?:ts|tsx)$/, '');
      return test.text.includes(component.name) && (test.text.includes(relative) || test.text.includes(`@/${component.file.slice(4).replace(/\.(?:ts|tsx)$/, '')}`));
    });
    for (const test of importedBy) {
      graph.addEdge({ type: 'TESTED_BY', from: component.id, to: test.id, purpose: `${test.title} renders or imports ${component.name}.` }, [test.evidence]);
    }
  }
  return { tests, skipSites };
}

export function governSkips(graph, root, detected, bootstrap) {
  const registryFile = path.join(root, 'ontology/test-exceptions.json');
  const uniqueDetected = [...new Map(detected.map((site) => [site.id, site])).values()];
  let registry = readJson(registryFile);
  if (!registry && bootstrap) {
    registry = {
      schemaVersion: '1.0.0',
      exceptions: uniqueDetected.map((site) => ({
        id: site.id,
        file: site.file,
        anchorLine: site.line,
        testId: site.testId,
        reason: site.reason,
        owner: graph.manifest.defaults.gapOwner,
        reviewDate: graph.manifest.defaults.gapReviewDate,
        issue: `./gap-register.md#gap-test-skip-${stableHash(site.id, 12)}`,
      })),
    };
    writeJson(registryFile, registry);
  }
  registry ??= { schemaVersion: '1.0.0', exceptions: [] };
  const uniqueRegistry = [...new Map(registry.exceptions.map((entry) => [entry.id, entry])).values()];
  if (uniqueRegistry.length !== registry.exceptions.length) {
    registry.exceptions = uniqueRegistry;
    writeJson(registryFile, registry);
  }
  let registryChanged = false;
  const siteById = new Map(uniqueDetected.map((site) => [site.id, site]));
  registry.exceptions = registry.exceptions.map((entry) => {
    const site = siteById.get(entry.id);
    if (!site?.testId || entry.testId === site.testId) return entry;
    registryChanged = true;
    return { ...entry, testId: site.testId };
  });
  if (registryChanged) writeJson(registryFile, registry);
  const registered = new Map(registry.exceptions.map((entry) => [entry.id, entry]));
  for (const site of uniqueDetected) {
    const entry = registered.get(site.id);
    if (!entry) {
      graph.addGap({
        id: `GAP-UNREGISTERED-SKIP-${stableHash(site.id, 10).toUpperCase()}`,
        severity: 'high', kind: 'UNREGISTERED_TEST_SKIP', subjectId: site.testId,
        summary: `Unregistered skipped-test site ${site.id} at ${site.file}:${site.line}.`,
        evidenceRefs: [site.evidence], nextAction: 'Add a reviewed entry to ontology/test-exceptions.json.'
      });
      continue;
    }
    graph.addGap({
      id: `GAP-TEST-SKIP-${stableHash(site.id, 12).toUpperCase()}`,
      severity: 'medium', kind: 'TEST_SKIP', subjectId: site.testId,
      summary: entry.reason,
      evidenceRefs: [site.evidence], owner: entry.owner, reviewDate: entry.reviewDate,
      nextAction: 'Remove the skip by migrating or stabilizing the scenario; otherwise renew its reviewed exception.'
    });
  }
  const detectedIds = new Set(uniqueDetected.map((site) => site.id));
  for (const entry of registry.exceptions) {
    if (!detectedIds.has(entry.id)) {
      graph.addGap({
        id: `GAP-STALE-SKIP-${stableHash(entry.id, 10).toUpperCase()}`,
        severity: 'low', kind: 'STALE_SKIP_EXCEPTION', subjectId: entry.testId,
        summary: `Skip exception ${entry.id} no longer matches source.`,
        nextAction: 'Delete the obsolete exception from ontology/test-exceptions.json.'
      });
    }
  }
  return registry;
}

export function extractCiDocumentsDeployments(graph, root, files, manifest) {
  for (const file of ['.github/workflows/ci-web.yml', '.github/workflows/e2e.yml']) {
    const workflow = YAML.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    for (const [jobKey, job] of Object.entries(workflow.jobs ?? {})) {
      const text = fs.readFileSync(path.join(root, file), 'utf8');
      const needle = `${jobKey}:`;
      const line = text.slice(0, text.indexOf(needle)).split('\n').length;
      const evidence = graph.addEvidence({ tier: 'E0', source: `code:${file}`, path: file, symbol: `jobs.${jobKey}`, line });
      const id = `ci-job:${path.posix.basename(file, '.yml')}:${jobKey}`;
      const commands = (job.steps ?? []).map((step) => step.run).filter(Boolean);
      graph.addNode(
        {
          id, type: 'CIJob', name: job.name ?? jobKey, path: file,
          purpose: `Runs the ${job.name ?? jobKey} continuous-integration job.`, domain: 'ci',
          attributes: { workflow: workflow.name, jobKey, runsOn: job['runs-on'], commands, condition: job.if }
        },
        [evidence]
      );
      addContainment(graph, 'system:namlend-ci', id, evidence);
      graph.addEdge({ type: 'DEPLOYED_BY', from: 'system:namlend-web', to: id, purpose: `The active web system is verified or deployed by ${job.name ?? jobKey}.` }, [evidence]);
    }
  }

  const deploymentDefs = [
    ['deployment:local-web', 'Local Vite development', 'http://localhost:8080', 'Runs the current checkout for local web development.', 'E0', 'package.json'],
    ['deployment:netlify-production', 'Netlify production', 'https://namlend-trust-portal-v220.netlify.app', 'Hosts the production web bundle built from main.', 'E2', manifest.notionPages[7].url],
    ['deployment:convex-production-linked', 'Convex production-linked deployment', 'aromatic-okapi-265', 'Hosts the shared production-linked Convex backend described by the operator runbook.', 'E2', manifest.notionPages[7].url],
    ['deployment:convex-e2e-preview', 'Convex disposable E2E previews', 'preview:e2e-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}', 'Creates a fresh, seeded Convex preview for each protected manual Playwright run; no shared or production deployment receives E2E mutations.', 'E0', '.github/workflows/e2e.yml'],
    ['deployment:convex-e2e-legacy', 'Retired shared Convex E2E deployment', 'brave-mole-108', 'Records the historical shared E2E target documented by the operations runbook; current setup safety explicitly rejects it.', 'E2', manifest.notionPages[7].url],
  ];
  for (const [id, name, deploymentPath, purpose, tier, source] of deploymentDefs) {
    const evidence = graph.addEvidence({
      tier, source: tier === 'E0' ? `code:${source}` : source, path: tier === 'E0' ? source : undefined,
      symbol: name, line: 1, commitSha: tier === 'E2' ? manifest.notionPages[7].claimedCommitSha : graph.commitSha,
      url: tier === 'E2' ? source : undefined
    });
    graph.addNode({ id, type: 'Deployment', name, path: deploymentPath, purpose, domain: 'deployment' }, [evidence]);
  }
  graph.addEdge({ type: 'DEPLOYED_BY', from: 'system:namlend-web', to: 'deployment:local-web', purpose: 'The web application runs locally through Vite.' }, graph.nodes.get('deployment:local-web').evidenceRefs);
  graph.addEdge({ type: 'DEPLOYED_BY', from: 'system:namlend-web', to: 'deployment:netlify-production', purpose: 'The web application is hosted by Netlify in production.' }, graph.nodes.get('deployment:netlify-production').evidenceRefs);
  graph.addEdge({ type: 'DEPLOYED_BY', from: 'system:namlend-convex', to: 'deployment:convex-production-linked', purpose: 'Convex backend code targets the documented production-linked deployment.' }, graph.nodes.get('deployment:convex-production-linked').evidenceRefs);
  graph.addEdge({ type: 'DEPLOYED_BY', from: 'system:namlend-convex', to: 'deployment:convex-e2e-preview', purpose: 'Convex backend code is exercised only against a fresh preview created for the protected E2E run.' }, graph.nodes.get('deployment:convex-e2e-preview').evidenceRefs);

  for (const file of manifest.activeDocuments.filter((candidate) => files.includes(candidate))) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const title = text.match(/^#\s+(.+)$/m)?.[1] ?? path.posix.basename(file);
    const firstParagraph = text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('['));
    const evidence = graph.addEvidence({ tier: 'E0', source: `code:${file}`, path: file, symbol: title, line: 1 });
    const id = `document:repo:${file}`;
    graph.addNode(
      { id, type: 'Document', name: title, path: file, purpose: cleanComment(firstParagraph) || `Documents ${humanize(title).toLowerCase()}.`, domain: 'documentation' },
      [evidence]
    );
    addContainment(graph, 'system:namlend-docs', id, evidence);
  }
}

export function ingestNotionAndCiEvidence(graph, manifest, metrics) {
  for (const page of manifest.notionPages) {
    const evidence = graph.addEvidence({
      tier: 'E2', source: page.url, url: page.url, symbol: page.title, line: 1,
      commitSha: page.claimedCommitSha ?? graph.commitSha, sourceRevision: page.lastEditedAt
    });
    const id = `document:notion:${page.id}`;
    graph.addNode(
      { id, type: 'Document', name: `${page.ordinal}. ${page.title}`, path: page.url, purpose: page.purpose, domain: 'documentation', attributes: { lastEditedAt: page.lastEditedAt, claimedCommitSha: page.claimedCommitSha } },
      [evidence]
    );
    addContainment(graph, 'system:namlend-docs', id, evidence);
    for (const claim of page.claims) {
      graph.addClaim({ subject: claim.subjectId, predicate: claim.predicate, object: claim.object, tier: 'E2', evidenceRefs: [evidence] });
      if (graph.nodes.has(claim.subjectId)) {
        graph.addEdge({ type: 'DOCUMENTED_IN', from: claim.subjectId, to: id, purpose: `${page.title} documents ${claim.subjectId}.` }, [evidence]);
      }
    }
    for (const redaction of page.redactions ?? []) {
      graph.addGap({
        id: redaction.findingId, severity: 'high', kind: 'SENSITIVE_DOCUMENTATION', subjectId: id,
        summary: redaction.description, evidenceRefs: [evidence],
        nextAction: 'Rotate or remove shared credentials from collaborative documentation and use a secret manager.'
      });
    }
  }

  const ciActual = {};
  for (const run of manifest.ciRuns) {
    for (const job of run.jobs ?? [{ id: `${run.id}:workflow`, name: run.workflow, url: run.url, results: run.results ?? {} }]) {
      const evidence = graph.addEvidence({
        tier: 'E1', source: job.url ?? run.url, url: job.url ?? run.url, symbol: job.name, line: 1,
        commitSha: run.headSha, runId: run.id, jobId: job.id,
        conclusion: run.conclusion, completedAt: run.completedAt,
        status: run.headSha === graph.commitSha ? 'CURRENT' : 'STALE'
      });
      for (const [key, value] of Object.entries(job.results ?? {})) {
        graph.addClaim({ subject: 'system:namlend-tests', predicate: `CI_${key.toUpperCase()}`, object: value, tier: 'E1', evidenceRefs: [evidence], status: run.headSha === graph.commitSha ? 'CURRENT' : 'STALE' });
        const predicateByResult = {
          unitPassed: 'HAS_UNIT_PASS_COUNT', unitSkipped: 'HAS_UNIT_SKIP_COUNT',
          e2ePassed: 'HAS_E2E_PASS_COUNT', e2eSkipped: 'HAS_E2E_SKIP_COUNT',
          convexPassed: 'HAS_CONVEX_PASS_COUNT', convexSkipped: 'HAS_CONVEX_SKIP_COUNT',
        };
        const predicate = predicateByResult[key];
        if (predicate && (!ciActual[predicate] || run.headSha === graph.commitSha)) {
          ciActual[predicate] = { value, tier: 'E1', evidenceRefs: [evidence] };
        }
      }
    }
  }

  const schemaEvidence = graph.addEvidence({ tier: 'E0', source: 'code:convex/schema.ts', path: 'convex/schema.ts', symbol: 'effective schema inventory', line: 1 });
  const featureEvidence = graph.addEvidence({ tier: 'E0', source: 'code:convex/lib/features.ts', path: 'convex/lib/features.ts', symbol: 'feature inventory', line: 1 });
  const planEvidence = graph.addEvidence({ tier: 'E0', source: 'code:convex/platform/seed.ts', path: 'convex/platform/seed.ts', symbol: 'PLAN_DEFS', line: 1 });
  const actualByPredicate = {
    HAS_EFFECTIVE_TABLE_COUNT: { value: metrics.effectiveTableCount, tier: 'E0', evidenceRefs: [schemaEvidence] },
    HAS_APPLICATION_TABLE_COUNT: { value: metrics.applicationTableCount, tier: 'E0', evidenceRefs: [schemaEvidence] },
    HAS_AUTH_TABLE_COUNT: { value: metrics.authTableCount, tier: 'E0', evidenceRefs: [schemaEvidence] },
    HAS_FEATURE_COUNT: { value: metrics.featureCount, tier: 'E0', evidenceRefs: [featureEvidence] },
    HAS_SEEDED_PLAN_COUNT: { value: metrics.planCount, tier: 'E0', evidenceRefs: [planEvidence] },
    HAS_GATED_ENTRY_POINT_COUNT: { value: metrics.gatedEntryPointCount, tier: 'E0', evidenceRefs: [featureEvidence] },
    HAS_GATED_FEATURE_COUNT: { value: metrics.gatedFeatureCount, tier: 'E0', evidenceRefs: [featureEvidence] },
    ...ciActual,
  };
  for (const [predicate, actual] of Object.entries(actualByPredicate)) {
    const subject = predicate.startsWith('HAS_UNIT_') || predicate.startsWith('HAS_E2E_') || predicate.startsWith('HAS_CONVEX_')
      ? 'system:namlend-tests'
      : predicate === 'HAS_FEATURE_COUNT' || predicate === 'HAS_SEEDED_PLAN_COUNT'
        ? 'system:namlend-web'
        : 'system:namlend-convex';
    graph.addClaim({ subject, predicate, object: actual.value, tier: actual.tier, evidenceRefs: actual.evidenceRefs });
  }
  for (const page of manifest.notionPages) {
    const documentId = `document:notion:${page.id}`;
    const evidenceRefs = graph.nodes.get(documentId).evidenceRefs;
    for (const claim of page.claims) {
      if (!(claim.predicate in actualByPredicate)) continue;
      const actual = actualByPredicate[claim.predicate];
      if (typeof claim.object === 'number' && claim.object !== actual.value) {
        graph.addClaim({
          subject: claim.subjectId, predicate: claim.predicate, object: claim.object, tier: 'E2',
          evidenceRefs, status: 'CONTRADICTED', reasoning: `Higher-precedence ${actual.tier} evidence reports ${actual.value}.`
        });
        graph.addConflict({
          id: `CONFLICT-${claim.predicate}-${page.ordinal}`,
          subjectId: claim.subjectId,
          predicate: claim.predicate,
          winner: { value: actual.value, tier: actual.tier, source: actual.tier === 'E1' ? 'current CI evidence' : 'current extraction' },
          loser: { value: claim.object, tier: 'E2', source: page.url },
          resolution: `Current code at ${graph.commitSha} wins over the older documented count.`,
          evidenceRefs,
          nextAction: 'Refresh the Notion page from the current generated coverage report; this implementation remains read-only.'
        });
      }
    }
  }

  const unprovenConvexPage = manifest.notionPages.find((page) => page.claims.some((claim) => claim.predicate === 'HAS_CONVEX_PASS_COUNT'));
  if (unprovenConvexPage && !actualByPredicate.HAS_CONVEX_PASS_COUNT) {
    const evidenceRefs = graph.nodes.get(`document:notion:${unprovenConvexPage.id}`).evidenceRefs;
    const claim = unprovenConvexPage.claims.find((item) => item.predicate === 'HAS_CONVEX_PASS_COUNT');
    graph.addClaim({ subject: claim.subjectId, predicate: claim.predicate, object: claim.object, tier: 'E2', evidenceRefs, status: 'STALE', reasoning: 'The enhanced CI has not yet produced current-SHA named Convex execution evidence.' });
    graph.addGap({
      id: 'GAP-CONVEX-E1-NOT-YET', severity: 'medium', kind: 'E1_NOT_YET_AVAILABLE', subjectId: 'system:namlend-tests',
      summary: 'Convex tests are code-inventoried but do not yet have an enhanced-CI named-result artifact.', evidenceRefs,
      nextAction: 'Run the enhanced CI on main and consume its current-SHA evidence artifact; do not rewrite this source snapshot from a local run.'
    });
  }
}

export function addCoverageAndGaps(graph, coverageMap) {
  const tests = [...graph.nodes.values()].filter((node) => node.type === 'Test');
  for (const group of [...coverageMap.lifecycle, ...coverageMap.invariants]) {
    const key = group.stage ?? group.id;
    const matches = tests.filter((test) => group.testTitleIncludes.some((needle) => test.name.toLowerCase().includes(needle.toLowerCase())));
    graph.addClaim({
      subject: `coverage:${key}`,
      predicate: 'MAPPED_TO_TEST_DECLARATION_COUNT',
      object: matches.length,
      tier: matches.length ? 'E0' : 'NONE',
      evidenceRefs: matches.flatMap((test) => test.evidenceRefs),
      status: matches.length ? 'CURRENT' : 'NOT_STATED'
    });
    if (!matches.length) {
      graph.addGap({
        id: `GAP-COVERAGE-${safeIdPart(key).toUpperCase()}`,
        severity: 'high', kind: 'BEHAVIOR_NOT_PROVEN', subjectId: `coverage:${key}`,
        summary: `No named test matched the required ${key} proof mapping.`,
        nextAction: `Add a focused executable test for ${key} or correct the evidence mapping.`
      });
    }
  }

  const functionalIncoming = new Map();
  const functionalOutgoing = new Map();
  for (const edge of graph.edges.values()) {
    if (edge.type === 'CONTAINS' || edge.type === 'DOCUMENTED_IN' || edge.type === 'DEPLOYED_BY') continue;
    functionalIncoming.set(edge.to, (functionalIncoming.get(edge.to) ?? 0) + 1);
    functionalOutgoing.set(edge.from, (functionalOutgoing.get(edge.from) ?? 0) + 1);
  }
  for (const node of graph.nodes.values()) {
    if ([
      'Route', 'ExternalSystem', 'System', 'Document', 'AccessPolicy', 'Test', 'CIJob',
      'Deployment', 'AgentTask', 'AgentRun', 'DecisionRecord', 'Receipt', 'Artifact'
    ].includes(node.type)) continue;
    if (node.attributes.ungatedReason || node.attributes.connectivityException) continue;
    if ((functionalIncoming.get(node.id) ?? 0) + (functionalOutgoing.get(node.id) ?? 0) === 0) {
      const gapId = graph.addGap({
        kind: 'FUNCTIONAL_ORPHAN', subjectId: node.id,
        summary: `${node.id} has no statically resolved functional edge.`,
        evidenceRefs: node.evidenceRefs,
        nextAction: 'Add resolvable wiring, an explicit evidence-backed exception, or remove unreachable code.'
      });
      node.attributes.gapIds = [...new Set([...(node.attributes.gapIds ?? []), gapId])];
    }
  }
  for (const node of graph.nodes.values()) {
    if (node.type !== 'Table') continue;
    const reads = [...graph.edges.values()].filter((edge) => edge.type === 'READS' && edge.to === node.id);
    const writes = [...graph.edges.values()].filter((edge) => edge.type === 'WRITES' && edge.to === node.id);
    if (node.attributes.sourceKind === 'convex-auth') {
      node.attributes.connectivityException = 'Reads and writes are mediated by the @convex-dev/auth dependency.';
      continue;
    }
    if (!reads.length || !writes.length) {
      const gapId = graph.addGap({
        kind: 'TABLE_CONNECTIVITY', subjectId: node.id,
        summary: `${node.id} has ${reads.length} statically resolved readers and ${writes.length} writers.`,
        evidenceRefs: node.evidenceRefs,
        nextAction: 'Improve static data-flow resolution or document why the table is intentionally read-only/write-only.'
      });
      node.attributes.gapIds = [...new Set([...(node.attributes.gapIds ?? []), gapId])];
    }
  }
  for (const node of graph.nodes.values()) {
    if (node.type === 'Function' && node.attributes.returns === 'NOT_STATED') {
      node.attributes.epistemicStatus = 'NOT_STATED';
    }
  }
  for (const external of [...graph.nodes.values()].filter((node) => node.type === 'ExternalSystem')) {
    const connected = [...graph.edges.values()].some((edge) => edge.to === external.id && graph.nodes.get(edge.from)?.type === 'Endpoint');
    if (!connected) {
      graph.addGap({
        kind: 'EXTERNAL_ENDPOINT_MISSING', subjectId: external.id,
        summary: `${external.id} has no connected endpoint.`, evidenceRefs: external.evidenceRefs,
        nextAction: 'Model the explicit protocol endpoint used by this external system.'
      });
    }
  }
}

export function extractionMetrics(graph, schemaMetrics, featureData, root) {
  let gatedEntryPointCount = 0;
  const gatedFeatures = new Set();
  for (const file of trackedFiles(root).filter((candidate) => candidate.startsWith('convex/') && candidate.endsWith('.ts') && !TEST_FILE_RE.test(candidate))) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of matchAll(text, /assertCallerFeatureEnabled\s*\([^,]+,\s*['"]([^'"]+)['"]\)/g)) {
      gatedEntryPointCount += 1;
      gatedFeatures.add(match[1]);
    }
  }
  return {
    ...schemaMetrics,
    featureCount: featureData.features.length,
    planCount: featureData.plans.length,
    gatedEntryPointCount,
    gatedFeatureCount: gatedFeatures.size,
    functionCount: [...graph.nodes.values()].filter((node) => node.type === 'Function').length,
    routeCount: [...graph.nodes.values()].filter((node) => node.type === 'Route').length,
    componentCount: [...graph.nodes.values()].filter((node) => node.type === 'Component').length,
    testCount: [...graph.nodes.values()].filter((node) => node.type === 'Test').length,
  };
}
