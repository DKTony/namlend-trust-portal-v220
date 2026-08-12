# NamLend system ontology

This directory is the versioned, generated proof model for the active React/Vite web application and Convex backend. Mobile, design prototypes, and historical Supabase assets are outside the system boundary; active imports of legacy Supabase code remain visible as external migration debt.

## Evidence contract

Evidence precedence is `E0 > E1 > E2 > E3 > ∅`:

- **E0**: code structure and path-content digest at the recorded repository SHA.
- **E1**: named passing test, workflow run, job, and head SHA.
- **E2**: reviewed documentation, including the read-only redacted Notion manifest.
- **E3**: human assertion without higher-precedence executable or documentary support.

Proof boundaries remain separate. For example, an outbox intent is not proof that TigerBeetle accepted a transfer, and an IPS callback processed by NamLend is not proof that external funds settled.

The source manifest never stores credentials or raw provider payloads. It records only a security finding when a source contains shared credentials.

## Commands

```bash
npm run ontology:extract
npm run ontology:check
npm run ontology:test
npm run ontology:impact -- table:loans
npm run ontology:diff -- <base-sha>
npm run ontology:ingest-results -- <vitest-or-playwright-json> [...]
```

`ontology:check` compares semantic content while ignoring only extraction timestamps. E0 evidence carries a path-content SHA-256 digest, allowing CI to detect path-specific drift even though a generated snapshot necessarily records the commit that existed before the snapshot itself is committed.

Local result ingestion from a dirty working tree is labeled `WORKTREE`/E3. Only
CI running at an exact `GITHUB_SHA` may publish current-commit E1 execution proof.

## Generated outputs

- `nodes.json`, `edges.json`, and `evidence-ledger.json` are the machine contracts.
- `graph.md` contains bounded Mermaid views; the JSON files are the complete graph.
- `coverage-report.md`, `conflict-register.md`, and `gap-register.md` are the human assurance views.
- `test-exceptions.json` is the reviewed skip registry. A new or stale runtime skip fails `ontology:check`.
- `ci-artifact/` is intentionally ignored. Green `main` CI builds it from upstream named-result artifacts without creating commits or pull requests.

Open gaps describe what the repository does not yet prove. The extractor does not silently alter lending behavior, seed production data, activate flags, deploy code, or write back to Notion.
