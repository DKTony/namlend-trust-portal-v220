# Production Release Plan — Loan Agreement (PRs #65, #63, #66)

**Prepared:** 2026-11-06 · **Target:** Convex `tangible-kookabura-81` + Netlify production site
**Owner:** the operator with Convex production and Netlify admin access. Agents do not deploy to production.

This plan ships the **code**. It does **not** start issuing agreements to customers. That is a
separate, configuration-only go-live (Part E), gated by legal sign-off.

---

## Part A — What is changing (verified 2026-11-06)

|                  | Production today           | After release                                                                                |
| ---------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| Convex functions | 523 (= `main` @ `08364b1`) | 547: **+24, none removed** (`loanAgreements.*`, `actions/loanAgreementPdf.render`)           |
| Convex tables    | 95                         | 99: **+4** (`agreementTemplates`, `agreementSettings`, `loanAgreements`, `sequenceCounters`) |
| `profiles`       | no `clientNumber`          | new optional fields; `clientNumber` filled in on next sign-in                                |
| Frontend         | `main`                     | agreement screens, settings page, client agreement page, `zod` 4 / `vitest` 4                |

Verified read-only through the Convex MCP server: production's function spec and table list were
compared with the release build already deployed to `aromatic-okapi-265`.

### Behaviour that changes in production immediately (before any configuration)

| Behaviour                                                              | Effect                                                  | Risk                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Approving a loan creates a **draft** agreement in the same transaction | Draft rows appear; nobody is notified                   | **Highest.** It shares a transaction with approval: an error here fails the approval. See C4. |
| Sign-in assigns a **client number** to profiles without one            | `profiles.clientNumber` populated over time             | Low; covered by `enrollment.test.ts`                                                          |
| New loans get a **loan number** (`OGFS-2026-000123`)                   | Visible on new loans                                    | Low                                                                                           |
| Credit Policy **default** origination fee is 0%                        | Only for institutions that never saved a policy         | Display only; no code ever charged it                                                         |
| Approving loans redirects staff to the agreement screen                | UX change                                               | Low                                                                                           |
| Disbursement gate                                                      | **Off** by default; no change                           | None                                                                                          |
| Customer-facing agreements                                             | **None.** Blocked until terms and settings are approved | None                                                                                          |

---

## Part B — Pre-flight (must all be true before release day)

| #   | Check                                                                                                  | How                                                                                                                         | Status 2026-11-06       |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| B1  | #65 merged to `main`                                                                                   | carries deps + review-date renewals                                                                                         | CI **green**, open      |
| B2  | #63 rebased on `main`, CI green                                                                        | resolve `ontology/*` conflicts by re-running `npm run ontology:extract`                                                     | open; red until rebased |
| B3  | #66 retargeted to `main`, rebased, CI green                                                            | CI only runs on PRs into `main`                                                                                             | not yet run in CI       |
| B4  | `Risk-tiered Human Review` passed on each PR                                                           | required check                                                                                                              | —                       |
| B5  | Release built against `brave-mole-108` (E2E) and **`ipp-lifecycle` E2E passing**                       | `npx convex run systemConfig:getPublicConfig --push --deployment-name brave-mole-108 --typecheck disable`, then the E2E job | not run                 |
| B6  | **Release date before 2026-11-19**, or `SEC-GH-SECRET-1` re-reviewed                                   | that date lapses and turns `Ontology & Evidence Contract` red for every PR                                                  | —                       |
| B7  | Rollback branch prepared and **test-deployed to `aromatic-okapi-265`**                                 | see Part D; branch `release/rollback-functions` @ `e19ba9a`                                                                 | **done**                |
| B8  | People available: operator (Convex prod + Netlify), one staff tester, 2 h after release for monitoring | —                                                                                                                           | —                       |

**Merge order:** #65 → #63 → #66. **Close #64** (superseded by #65).

---

## Part C — Release day runbook (≈ 45 min, outside business hours)

The rule that drives the order: **Netlify publishes `main` automatically**, and the new frontend
calls functions that don't exist in production until Convex is deployed. Lock Netlify first, deploy
Convex, then publish the frontend. The backend is safe to run under the current frontend because
the change is additive.

| Step | Action                                                                                                                                                                                                          | Verify / abort if                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1   | **Netlify → Deploys → "Lock to stop auto publishing"**                                                                                                                                                          | Banner shows publishing locked                                                                                                                                      |
| C2   | Merge #63 then #66 into `main` (#65 already merged)                                                                                                                                                             | Netlify builds, but does **not** publish                                                                                                                            |
| C3   | **Convex dashboard → `tangible-kookabura-81` → Backups → Backup now (include file storage)**                                                                                                                    | Backup listed as complete. **Abort if it fails.**                                                                                                                   |
| C4   | `git checkout main && git pull` and record the SHA. Then `npx convex deploy` and answer _yes_ to the production prompt.                                                                                         | The prompt names `tangible-kookabura-81`. Ends with "Deployed Convex functions". **Abort on schema validation errors**: nothing is applied when a push is rejected. |
| C5   | Verify the backend (read-only): `mcp__convex__functionSpec` / `npx convex function-spec --prod`                                                                                                                 | **547 functions**, 24 `loanAgreement*`. `render` is internal.                                                                                                       |
| C6   | Watch Convex logs for 10 min (dashboard → Logs, filter errors)                                                                                                                                                  | No new errors in `loans:approveLoan`, `approvalWorkflow:processApprovalRequest` or `users`.                                                                         |
| C7   | **Netlify → publish the `main` build** (or unlock)                                                                                                                                                              | Production bundle still targets `tangible-kookabura-81`. Check by grepping the deployed JS for `convex.cloud`.                                                      |
| C8   | Smoke test as staff, **no writes to real loans**: sign in, open Loans, open Settings → Loan Agreement (expect the "cannot be issued yet" readiness list), open Credit Policy → Fees (copy says "Not collected") | Pages load; browser console free of Convex errors                                                                                                                   |
| C9   | Client smoke test: a client signs in and opens a loan                                                                                                                                                           | No agreement card shown, which is correct: none have been issued                                                                                                    |
| C10  | Announce done; keep monitoring per Part F                                                                                                                                                                       | —                                                                                                                                                                   |

**Do not** approve a real customer's loan to test. The first organic approval will create the first
draft agreement. Watch it under Part F.

---

## Part D — Rollback

Once production has written a `clientNumber`, or any row to the new tables, **the old `main`
schema can no longer be redeployed**: Convex rejects a schema that existing documents violate. So
"redeploy the previous commit" is **not** a rollback here.

| Layer               | Rollback                                                                                                                                                                                                        | Time   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Frontend            | Netlify → Deploys → previous production deploy → **Publish deploy**                                                                                                                                             | ~1 min |
| Backend (functions) | Deploy the prepared **`release/rollback-functions`** branch: previous `main` function code + the **new** `convex/schema.ts` (and the `convex/lib/agreement/*` files it imports). Data stays; behaviour reverts. | ~5 min |
| Data                | Not deleted (7-year retention). New rows are inert without the new functions. Restore from the C3 backup **only** for corruption, never just to undo the release.                                               | —      |

**Rollback triggers:** any approval failing where it succeeded before; sign-in errors; disbursement
errors; a sustained Convex error rate on `loans`, `approvalWorkflow` or `users`.

**Preparing the rollback branch (B7):** branch from pre-release `main`, copy in the release's
`convex/schema.ts` and `convex/lib/agreement/`, then deploy it to `aromatic-okapi-265` to prove it
pushes. Redeploy the release there afterwards.

**B7 result (2026-11-06):** `release/rollback-functions` @ `e19ba9a`, built from `main` @
`08364b1` plus the release's `convex/schema.ts` and `convex/lib/agreement/types.ts` (the only
agreement file the schema imports). Typecheck clean, 212/212 Convex tests. Deployed to
`aromatic-okapi-265`: schema accepted, **523 functions, 0 `loanAgreement*`**. The release was then
redeployed there (547 functions). If `main` gains backend commits before release day, rebuild this
branch from the new pre-release `main` and repeat the test deploy.

---

## Part E — Configuration go-live (separate change, after the code is stable)

Customer issue stays blocked until every item here is done. Each one is an admin action in the app.

1. **Legal:** final wording for clauses 5, 13, 14 and 15. Then **Settings → Loan Agreement → Load
   terms → Replace drafting notes → Approve version**.
2. **Fees:** check the **origination fee badge** on that page. If it shows anything above 0%, a
   saved Credit Policy exists: set it to 0% under **Credit Policy → Fees**.
3. **Company information:** **Fill from source document**, correct the contact email
   (`mgholdingptyltd.com` domain) and website, add the representative, **Save → Approve**.
4. **Legal confirmation** that in-app acceptance suffices. If not, keep the gate on and use the
   signed-upload path.
5. **Pilot:** issue one agreement to an internal or consenting client, and complete accept →
   archived. Check the executed PDF.
6. **Then** decide whether to switch on **"Require an accepted agreement before disbursement."**
   It applies immediately to every approved loan not yet disbursed, including ones approved before
   go-live. Generate their agreements first.

---

## Part F — Post-release monitoring (first 48 h)

| Watch                               | Where                                                                       | Healthy                                       |
| ----------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| Approvals succeed                   | Convex logs: `loans:approveLoan`, `approvalWorkflow:processApprovalRequest` | No new error class                            |
| Each approval has a draft agreement | Loans → Approved → View contract                                            | Draft present, readiness lists what's missing |
| Client numbers assigned             | Client profile pages                                                        | `000001`… without duplicates                  |
| PDF renders (after Part E)          | `loanProcessingFailures` with stage `agreementGeneration`                   | Empty                                         |
| Disbursements unaffected            | Payments / Disbursements dashboards                                         | Normal volume                                 |
