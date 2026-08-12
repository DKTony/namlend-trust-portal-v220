# Graphify discovery sidecar

Graphify is optional, read-only repository discovery. The generated graph is not
NamLend evidence and must never be promoted to E0/E1 without source or named-test
verification by the authoritative ontology.

The wrapper copies only allowlisted tracked files to a temporary corpus and runs
Graphify in local `--code-only --no-cluster` mode. It does not install Graphify's
agent instructions, hooks, merge driver, MCP/HTTP server, global graph, memory,
semantic providers, or query logs.

Use `npm run graphify:check` before extraction, `npm run graphify:extract`, and
`npm run graphify:query -- "question"`. The cache under `.cache/graphify/` is
replaceable and ignored by Git.

Bootstrap the ignored Python 3.12 environment with `uv sync --frozen --project
tools/graphify`. Subsequent runs verify and use the local Graphify 0.9.40
executable; if it is absent or has the wrong version, the wrapper requires `uv`
and recreates execution from the hash-locked `uv.lock`.
