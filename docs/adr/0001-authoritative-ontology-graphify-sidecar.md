# ADR 0001: Authoritative ontology with a Graphify discovery sidecar

- Status: accepted
- Date: 2026-08-12
- Owner: NamLend Engineering

## Decision

The generated NamLend ontology is authoritative for inventory, evidence, proof
boundaries and change impact. Graphify 0.9.40 is pinned as an optional local,
code-only, read-only discovery sidecar. Graphify output cannot become E0/E1 unless
the ontology independently extracts source evidence or a named current-SHA test.

## Consequences

Exact assurance queries use the ontology. Graphify may be removed without changing
builds, product behavior or proof. Cloud semantic extraction, query logging, memory,
hooks, merge drivers, global graphs, HTTP and MCP are disabled.
