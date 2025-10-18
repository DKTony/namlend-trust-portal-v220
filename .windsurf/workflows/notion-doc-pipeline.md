---
description: This pipeline writes our @docs into notion-ai. it updates those docs and makes sure its up to date
auto_execution_mode: 1
---

Got it, Tony. Here’s a tightened, operations-ready spec you can drop into an advanced AI coding agent to build a documentation pipeline from Windsurf AI to your Notion page.

# Documentation Pipeline Spec (Windsurf → Notion)

## 0) High-Level Goal

Create an automated, repeatable pipeline that (a) audits the project’s technical state, (b) updates and normalizes docs in the Windsurf repo’s `@docs` directory, and (c) syncs the final artifacts to the Notion page:

* **Primary source directory:** `@docs`
* **Target Notion page:** `https://www.notion.so/docs-27d83bbf4057805bac0ec8289bd6424f?source=copy_link`
* **Target Notion Page ID:** `27d83bbf4057805bac0ec8289bd6424f`

---

## 1) Operating Modes

1. **Audit Mode**

   * Inventory code, infra, and docs; detect drift; generate findings & gaps.
2. **Update Mode**

   * Apply structured updates to `@docs`, regenerate diagrams, fix links, update indices.
3. **Sync Mode**

   * Normalize, render, and publish `@docs` to the Notion page with idempotent upserts.

---

## 2) Inputs & Outputs

### Inputs

* Repo workspace with canonical `@docs/`
* Codebase + IaC (for architecture introspection)
* Notion API credentials: `NOTION_TOKEN`
* Optional diagram sources in `@docs/diagrams/` (PlantUML/Mermaid)

### Outputs

* Updated files in `@docs/`
* Audit report: `@docs/audit/audit-report.md`
* Changelog: `@docs/CHANGELOG_DOCS.md`
* Notion content tree updated under the target page (sections/pages mirrored from `@docs`)

---

## 3) Required Doc Set (minimum viable suite)

```
@docs/
  context.md                      # Single-source-of-truth overview
  architecture/
    system-overview.md
    components.md
    data-flows.md
    deployment-topology.md
    dependencies.md
  runbooks/
    onboarding.md
    local-dev.md
    ci-cd.md
    incident-response.md
    release-management.md
  reference/
    api.md
    domain-model.md
    config.md
    envs.md
  decisions/
    adr-000-template.md
    adr-00N-*.md
  diagrams/
    *.puml | *.mmd
  qa/
    doc-qa-checklist.md
    link-check-report.md
  audit/
    audit-report.md
CHANGELOG_DOCS.md
INDEX.md                          # Auto-generated sitemap of docs
```

**Hard requirement:** `@docs/context.md` must be complete, correct, and cross-linked—it’s the canonical entry point.

---

## 4) Audit Mode – Tasks

* **Inventory**

  * Scan repo for services, packages, IaC modules, CI jobs, database schemas, and externally referenced systems.
* **Drift detection**

  * Compare detected components vs. what’s documented in `@docs/*`. Flag missing/obsolete docs.
* **Decision capture**

  * Generate/update ADRs for decisions inferred from code/config (framework choices, data store selections, scaling patterns, security posture).
* **Outputs**

  * `audit-report.md` with:

    * Completed milestones & deliverables
    * Open technical debt / TODOs needing documentation
    * Undocumented components & diagrams to update
    * Risk items (operational, security, compliance)
    * Recommended updates (ordered by impact)

---

## 5) Update Mode – Tasks

* **Normalize tone & structure**

  * Enforce heading hierarchy, glossary, consistent terminology.
* **Update `context.md`**

  * Must reflect: current architecture, key components, data boundaries, deployment paths, SLIs/SLOs (if available), and pointers to deeper docs.
* **Technical diagrams**

  * Rebuild from sources (`.puml` / `.mmd`). If only images exist, generate source equivalents where feasible.
  * Ensure versioned diagram assets with content hashes (e.g., `system-overview.<short-hash>.png`) and update references.
* **Link integrity**

  * Validate all internal relative links and external URLs; produce `qa/link-check-report.md`.
* **Tables of contents**

  * Generate `INDEX.md` with a complete doc sitemap.
* **Changelog**

  * Append concise entries to `CHANGELOG_DOCS.md` with date and summary.

---

## 6) Sync Mode – Notion Mapping

* **Page model**

  * Root: Target page (`27d83bbf4057805bac0ec8289bd6424f`)
  * Children: One Notion subpage per top-level folder/file under `@docs`

    * `context.md` → pinned at top, rich-text block(s) on root page
    * Other files → subpages mirroring `@docs` structure
* **Block mapping**

  * Markdown → Notion blocks (headings, bulleted/numbered lists, code blocks, callouts, tables).
  * Images/diagrams → uploaded files; keep same filenames; link back to source in a caption.
* **Idempotency**

  * Use a deterministic page path key: `notion_path = <relative path from @docs>`
  * On re-runs: update existing blocks in place; do not duplicate pages.
* **Metadata**

  * Add page properties: `source_path`, `last_synced`, `doc_hash`, `doc_status` (`complete|partial|needs-review`).

---

## 7) Quality Bar (Enterprise-grade)

* **Accuracy**: Doc content must match runtime reality; no stale diagrams.
* **Completeness**: A new engineer can stand up, deploy, and change a component using only the docs.
* **Clarity**: Prefer examples and checklists over prose. No unexplained acronyms.
* **Traceability**: All design decisions link to ADRs; diagrams link to sources.
* **Testability**: Link-check clean; lint passes; diagram builds succeed.

**Definition of Done (per run)**

* `context.md` updated and cross-linked
* All diagrams rebuilt & in sync
* Link check passes (0 broken internal links; external warnings allowed if unreachable after 2 retries)
* `INDEX.md`, `CHANGELOG_DOCS.md` updated
* Notion sync completed with matching counts (files↔pages)

---

## 8) File Conventions & Lint Rules

* **Front-matter (optional but recommended)**

  ```yaml
  ---
  title: System Overview
  status: complete
  last_reviewed: 2025-09-29
  owners: [platform@company.com]
  ---
  ```
* **Headings:** start at `#` per file, no jumps (H1→H2→H3…).
* **Code blocks:** specify language fences.
* **Links:** use relative links within `@docs` (e.g., `../architecture/components.md`).
* **Diagrams:** keep editable sources; generate PNG/SVG alongside.

---

## 9) Diagram Generation

* **Mermaid (`.mmd`)**: render to PNG and SVG
* **PlantUML (`.puml`)**: render to PNG and SVG
* Embed in Markdown as:

````md
![System Overview](../diagrams/system-overview.<hash>.png)
<details>
  <summary>Source</summary>

```mermaid
...diagram source...
````

</details>
```

---

## 10) Notion Sync Implementation (reference)

> Pseudocode (Node/TypeScript-ish)

```ts
// prerequisites: NOTION_TOKEN, ROOT_PAGE_ID=27d83bbf4057805bac0ec8289bd6424f
// 1) Walk @docs and parse Markdown -> AST
// 2) Compute content hash per file (normalized Markdown)
// 3) Map files to Notion pages using path key
// 4) Upsert pages and blocks, upload assets

async function syncDocs() {
  const files = await readDocsTree('@docs');
  for (const file of files) {
    const md = await fs.readFile(file.path, 'utf8');
    const ast = parseMarkdown(md);
    const hash = contentHash(ast);

    const notionPathKey = relative('@docs', file.path).replaceAll(path.sep, '/');
    const pageId = await ensureSubpage(ROOT_PAGE_ID, notionPathKey, {
      title: humanTitle(file.path),
      properties: {
        source_path: notionPathKey,
        doc_hash: hash,
        doc_status: metaStatus(ast),
        last_synced: nowISO(),
      }
    });

    const blocks = mdAstToNotionBlocks(ast);        // headings, paragraphs, code, tables, callouts
    const assets = await collectAssets(ast);         // images in diagrams/
    await upsertBlocks(pageId, blocks);              // minimal diff update
    await uploadAssets(pageId, assets);              // set captions with source paths

    recordSync(file.path, pageId, hash);
  }
}
```

**Notes**

* Prefer a minimal-diff block update (avoid wiping the page to preserve comments/history).
* For very large pages, chunk blocks (< 100 per batch) respecting Notion API limits.
* Store a local `notion-sync-map.json` (path ↔ pageId ↔ lastHash) to speed subsequent runs.

---

## 11) Automation Hooks

* **Pre-commit:** doc lint (`markdownlint`), broken link scan (internal only).
* **CI job: `docs_audit`** runs on main and daily schedule, outputs `audit-report.md`.
* **CI job: `docs_build`** regenerates diagrams and `INDEX.md`.
* **CI job: `docs_sync_notion`** publishes to Notion (protected; runs on main or manual trigger).
* **Artifacts:** upload `qa/link-check-report.md` and `audit/audit-report.md`.

---

## 12) AI Agent Behavior (prompt contract)

**System prompt (Windsurf agent)**

* *Role*: “You are a senior documentation engineer and platform architect. Your job is to keep `@docs` truthful, complete, and synced to Notion.”
* *Constraints*: Never invent technical details; derive from code/IaC or clearly mark as `TODO: confirm`.
* *Priorities*: Accuracy > Completeness > Style.
* *Output format*: Valid Markdown in `@docs`, plus machine-readable JSON summaries where specified.

**Tools available to the agent (examples)**

* Filesystem read/write in repo
* Mermaid/PlantUML renderers
* Markdown lint & link checker
* Notion REST client

**Agent loop**

1. Run Audit → produce/update `audit-report.md`.
2. Plan updates → write a task list to `@docs/audit/plan.md`.
3. Apply updates to target files.
4. Rebuild diagrams, run linters, fix links.
5. If clean, run Notion Sync.
6. Append entry to `CHANGELOG_DOCS.md`.

**Agent guardrails**

* If a claim cannot be verified from repo/IaC/CI config, mark as `TODO` and log in audit.
* Never delete existing content without backing it up to `@docs/.archive/` with timestamp.

---

## 13) Checklists

**Audit checklist**

* [ ] Services & packages enumerated
* [ ] Envs & configs documented
* [ ] Data stores & schemas referenced
* [ ] External integrations listed
* [ ] CI/CD pipelines described
* [ ] Observability (logs/metrics/traces) noted
* [ ] Security posture (secrets, authn/z) summarized
* [ ] Open debt captured with owners

**Update checklist**

* [ ] `context.md` current and linked
* [ ] Diagrams rebuilt from sources
* [ ] ADRs created/updated
* [ ] Link check 100% internal pass
* [ ] `INDEX.md` regenerated
* [ ] `CHANGELOG_DOCS.md` updated

**Sync checklist**

* [ ] Page tree mirrors `@docs`
* [ ] Properties set (`source_path`, `doc_hash`, `last_synced`, `doc_status`)
* [ ] Asset uploads succeed
* [ ] Idempotent re-run produces zero changes

---

## 14) Security & Compliance

* Store `NOTION_TOKEN` as a CI secret; never commit.
* Scrub secrets from docs (redact examples).
* Respect license headers for copied snippets.
* If PII appears, mask or move to private runbooks.

---

## 15) Failure Recovery

* On sync failure, write a JSON error report to `@docs/qa/notion-sync-errors.json`.
* Maintain `@docs/.archive/` with pre-change snapshots (git tag per successful sync: `docs-sync-YYYYMMDD-HHMM`).

---

## 16) Success Metrics

* Mean time for a new engineer to deploy locally ≤ 60 minutes using docs only.
* Internal link error rate = 0
* Diagram source coverage ≥ 95% (no orphaned PNGs)
* Sync runs clean 3× consecutively

---

## 17) Example Minimal Commands (you can implement)

```bash
# Lint & links
npm run docs:lint
npm run docs:links

# Diagrams
npm run docs:diagrams

# Audit
npm run docs:audit

# Build index + changelog entry
npm run docs:build

# Sync to Notion (requires NOTION_TOKEN)
npm run docs:sync
```

---

## 18) Templates

**ADR template (`@docs/decisions/adr-000-template.md`)**

```md
# ADR-000: <Title>
Date: 2025-09-29
Status: accepted | superseded | proposed
Context:
Decision:
Consequences:
References:
```

**Runbook section skeleton**

```md
## Preconditions
## Steps
## Validation
## Rollback
## Known Issues
```

---


