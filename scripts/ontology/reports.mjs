import fs from 'node:fs';
import path from 'node:path';
import { safeIdPart } from './model.mjs';

function md(value) {
  return String(value ?? 'NOT_STATED').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function anchor(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function mermaidId(value) {
  return `n_${safeIdPart(value).replace(/[^A-Za-z0-9_]/g, '_')}`;
}

function graphView(graph, title, predicate, maxNodes = 36) {
  const selectedEdges = [...graph.edges.values()]
    .filter(predicate)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 70);
  const nodeIds = [...new Set(selectedEdges.flatMap((edge) => [edge.from, edge.to]))].slice(0, maxNodes);
  const allowed = new Set(nodeIds);
  const lines = [`### ${title}`, '', '```mermaid', 'flowchart LR'];
  if (!nodeIds.length) lines.push('  empty["No statically resolved edges in this view"]');
  for (const id of nodeIds) {
    const node = graph.nodes.get(id);
    if (!node) continue;
    lines.push(`  ${mermaidId(id)}["${md(node.name).replaceAll('"', "'")}"]`);
  }
  for (const edge of selectedEdges) {
    if (!allowed.has(edge.from) || !allowed.has(edge.to)) continue;
    lines.push(`  ${mermaidId(edge.from)} -- "${edge.type}" --> ${mermaidId(edge.to)}`);
  }
  lines.push('```', '');
  return lines.join('\n');
}

export function graphMarkdown(graph, metrics) {
  const views = [
    graphView(graph, 'Authentication and routing', (edge) =>
      ['ROUTES_TO', 'GATED_BY'].includes(edge.type) &&
      [edge.from, edge.to].some((id) => /route:|role:|access-policy:|auth/i.test(id))
    ),
    graphView(graph, 'Tenancy and entitlements', (edge) =>
      ['ENTITLES', 'ENFORCED_BY', 'DEPENDS_ON', 'GATED_BY'].includes(edge.type) &&
      [edge.from, edge.to].some((id) => /feature:|plan:|flag:|tenan/i.test(id))
    ),
    graphView(graph, 'Lending lifecycle', (edge) =>
      ['CALLS', 'READS', 'WRITES', 'SCHEDULES'].includes(edge.type) &&
      [edge.from, edge.to].some((id) => /loan|kyc|collection/i.test(id))
    ),
    graphView(graph, 'Money movement', (edge) =>
      ['CALLS', 'READS', 'WRITES', 'POSTS_TO', 'SETTLES_VIA', 'HANDLED_BY'].includes(edge.type) &&
      [edge.from, edge.to].some((id) => /payment|disbursement|settlement|reconciliation|tigerbeetle|ips|ipp/i.test(id))
    ),
    graphView(graph, 'Notifications', (edge) =>
      ['CALLS', 'READS', 'WRITES', 'NOTIFIES_VIA', 'SCHEDULES'].includes(edge.type) &&
      [edge.from, edge.to].some((id) => /notification|sms|whatsapp|communication/i.test(id))
    ),
    graphView(graph, 'CI and deployment', (edge) =>
      ['DEPLOYED_BY', 'TESTED_BY'].includes(edge.type) &&
      [edge.from, edge.to].some((id) => /ci-job:|deployment:|system:namlend/i.test(id))
    ),
  ];
  return `# NamLend proof graph

Generated from active web, Convex, test, workflow, document, and redacted source-manifest inputs at commit \`${graph.commitSha}\`.

| Inventory | Count |
| --- | ---: |
| Effective Convex tables | ${metrics.effectiveTableCount} |
| Convex indexes | ${metrics.effectiveIndexCount} |
| Convex functions | ${metrics.functionCount} |
| Web routes | ${metrics.routeCount} |
| React components | ${metrics.componentCount} |
| Features | ${metrics.featureCount} |
| Seeded plans | ${metrics.planCount} |
| Named tests | ${metrics.testCount} |

Evidence precedence is \`E0 > E1 > E2 > E3 > ∅\`. The machine graph retains every supporting or contradicting reference; diagrams below are bounded audit views rather than the full graph.

${views.join('\n')}`;
}

export function conflictMarkdown(graph) {
  const conflicts = [...graph.conflicts.values()].sort((a, b) => a.id.localeCompare(b.id));
  const sections = conflicts.map((conflict) => `## ${conflict.id}

- Subject: \`${conflict.subjectId}\` / \`${conflict.predicate}\`
- Status: ${conflict.status}
- Winner: \`${md(JSON.stringify(conflict.winner))}\`
- Contradicted source: \`${md(JSON.stringify(conflict.loser))}\`
- Resolution: ${md(conflict.resolution)}
- Owner: ${md(conflict.owner)}
- Next action: ${md(conflict.nextAction)}
- Evidence: ${conflict.evidenceRefs.map((id) => `\`${id}\``).join(', ') || 'NOT_STATED'}
`);
  return `# Conflict register

Code-derived E0 and named execution E1 evidence take precedence over E2 documentation. Lower-precedence claims remain preserved as contradicted evidence.

${sections.join('\n') || 'No conflicts were extracted.'}`;
}

export function gapMarkdown(graph) {
  const gaps = [...graph.gaps.values()].sort((a, b) => a.id.localeCompare(b.id));
  const rows = gaps.map((gap) =>
    `| <a id="${anchor(gap.id)}"></a>\`${gap.id}\` | ${md(gap.severity)} | ${md(gap.kind)} | \`${md(gap.subjectId)}\` | ${md(gap.summary)} | ${md(gap.owner)} | ${md(gap.reviewDate)} | ${md(gap.nextAction)} |`
  );
  return `# Gap register

Open gaps are evidence about the boundary of what this repository proves. They are not silently converted into runtime fixes.

| Gap | Severity | Kind | Subject | Finding | Owner | Review | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n') || '| — | — | — | — | No gaps extracted. | — | — | — |'}
`;
}

export function coverageMarkdown(graph, metrics) {
  const coverageClaims = [...graph.claims.values()]
    .filter((claim) => claim.subject.startsWith('coverage:') && claim.predicate === 'MAPPED_TO_TEST_DECLARATION_COUNT')
    .sort((a, b) => a.subject.localeCompare(b.subject));
  const proven = coverageClaims.filter((claim) => Number(claim.object) > 0).length;
  const tableNodes = [...graph.nodes.values()].filter((node) => node.type === 'Table');
  const tableRows = tableNodes.map((node) => {
    const readers = [...graph.edges.values()].filter((edge) => edge.type === 'READS' && edge.to === node.id).length;
    const writers = [...graph.edges.values()].filter((edge) => edge.type === 'WRITES' && edge.to === node.id).length;
    return `| \`${node.id}\` | ${readers} | ${writers} | ${node.attributes.connectivityException ?? (node.attributes.gapIds?.join(', ') || 'connected')} |`;
  });
  const behaviorRows = coverageClaims.map((claim) =>
    `| \`${claim.subject.slice('coverage:'.length)}\` | ${claim.object} | ${claim.status} | ${claim.evidenceRefs.map((id) => `\`${id}\``).join(', ')} |`
  );
  return `# Ontology coverage report

Commit: \`${graph.commitSha}\`

## Assurance summary

| Measure | Result |
| --- | ---: |
| Required behavior/invariant mappings with named E0 test declarations | ${proven}/${coverageClaims.length} |
| Effective Convex tables | ${metrics.effectiveTableCount} |
| Application tables | ${metrics.applicationTableCount} |
| Convex Auth tables | ${metrics.authTableCount} |
| Indexes | ${metrics.effectiveIndexCount} |
| Features / seeded plans | ${metrics.featureCount} / ${metrics.planCount} |
| Registered gaps | ${graph.gaps.size} |
| Resolved conflicts | ${[...graph.conflicts.values()].filter((item) => item.status === 'resolved').length} |

## Required behavior and invariants

These mappings are E0 evidence that an executable test is declared. Named passing results become E1 only in the current-SHA CI evidence artifact.

| Proof target | Matching named E0 test declarations | Status | Evidence |
| --- | ---: | --- | --- |
${behaviorRows.join('\n')}

## Table connectivity

| Table | Readers | Writers | Status / exception |
| --- | ---: | ---: | --- |
${tableRows.join('\n')}
`;
}

export function writeReports(root, graph, metrics) {
  const outputs = {
    'graph.md': graphMarkdown(graph, metrics),
    'conflict-register.md': conflictMarkdown(graph),
    'gap-register.md': gapMarkdown(graph),
    'coverage-report.md': coverageMarkdown(graph, metrics),
  };
  for (const [name, contents] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(root, 'ontology', name), contents.endsWith('\n') ? contents : `${contents}\n`);
  }
  return outputs;
}
