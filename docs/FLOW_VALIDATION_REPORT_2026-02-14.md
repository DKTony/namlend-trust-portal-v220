# NamLend Trust - Flow Validation Report (2026-02-14)

**Doc Revision**: 2026-02-15  
**Status**: Active  
**Scope**: Phase 4 flow-cluster execution and focused re-validation against `docs/FLOWS.md`

---

## Execution Summary

Two flow-cluster Playwright batches were executed:

1. UI flow cluster
2. API flow cluster

Overall outcome:

- **Passed**: 38
- **Failed**: 69
- **Skipped**: 6

---

## Focused Re-Validation (2026-02-15)

Requested execution order:

1. Fix + re-run LF-03 (`e2e/backoffice-disbursement.e2e.ts`) only
2. Re-run API suites in throttled shards
3. Convert static gaps into owner/severity PR tasks

### LF-03 Result

- Command: `/bin/zsh -lc "DOTENV_CONFIG_PATH=.env.local npx playwright test e2e/backoffice-disbursement.e2e.ts"`
- Result: **9 passed, 1 skipped**
- Fixes applied before rerun:
  - `src/pages/AdminDashboard/hooks/useLoanApplications.ts`: omit empty `startDate`/`endDate` query values to prevent `Invalid datetime` API failures
  - `e2e/helpers/admin.ts`: robust sidebar-tab navigation/open behavior
  - `e2e/backoffice-disbursement.e2e.ts`: resilient tab and modal entry helpers

### API Shard Results (Throttled)

Throttle mode: `--workers=1` on all shard reruns.

Commands:

```bash
/bin/zsh -lc "DOTENV_CONFIG_PATH=.env.local npx playwright test --workers=1 e2e/api/admin-rpc.e2e.ts e2e/api/disbursements-ledger.e2e.ts e2e/api/disbursements-ledger-crud.e2e.ts e2e/api/tigerbeetle-balance.e2e.ts"
/bin/zsh -lc "DOTENV_CONFIG_PATH=.env.local npx playwright test --workers=1 e2e/api/disbursement.e2e.ts e2e/api/disbursements-rls.e2e.ts e2e/api/api-disbursements-orchestration.e2e.ts e2e/api/ips-rpc.e2e.ts"
/bin/zsh -lc "DOTENV_CONFIG_PATH=.env.local npx playwright test --workers=1 e2e/api/api-analytics.e2e.ts e2e/api/api-audit.e2e.ts e2e/api/api-collections.e2e.ts e2e/api/api-notifications.e2e.ts"
/bin/zsh -lc "DOTENV_CONFIG_PATH=.env.local npx playwright test --workers=1 e2e/api/api-reconciliation.e2e.ts e2e/api/approval-rpc-race-condition.e2e.ts e2e/api/documents-rls.e2e.ts e2e/api/ips-adapter.e2e.ts"
```

1. Shard A (`admin-rpc`, `disbursements-ledger*`, `tigerbeetle-balance`): **8 passed**
2. Shard B (`disbursement`, `disbursements-rls`, `api-disbursements-orchestration`, `ips-rpc`): **56 passed, 2 failed**
3. Shard C (`api-analytics`, `api-audit`, `api-collections`, `api-notifications`): **41 passed, 25 failed**
4. Shard D (`api-reconciliation`, `approval-rpc-race-condition`, `documents-rls`, `ips-adapter`): **39 passed, 2 failed, 4 skipped**

Aggregate API rerun outcome:

- **Passed**: 144
- **Failed**: 29
- **Skipped**: 4

### Auth Rate-Limit Noise Mitigation

`e2e/fixtures.ts` was updated with bounded auth retry/backoff in `authenticateClient` to reduce transient Supabase auth throttling noise during shard runs.

### Deterministic Failure Themes (Post-Mitigation)

1. **Auth contract drift**: multiple suites expect `403`, but endpoints return `401`.
2. **Response-shape drift**: analytics and collections tests assert legacy keys while APIs return nested/updated payloads.
3. **Endpoint availability/behavior drift**: `api-disbursements-orchestration` queue endpoint returns `404` where test expects `200`; notifications preferences/send flows return `404`/`500`; reconciliation role-negative assertions return `401` vs expected `403`.

---

## Commands Executed

```bash
/bin/zsh -lc "DOTENV_CONFIG_PATH=.env.local npx playwright test e2e/loan-application.e2e.ts e2e/admin-approvals.e2e.ts e2e/admin-approvals-actions.e2e.ts e2e/backoffice-disbursement.e2e.ts e2e/ips-payment-flow.e2e.ts e2e/role-routing.e2e.ts e2e/navigation-pages.e2e.ts"

/bin/zsh -lc "DOTENV_CONFIG_PATH=.env.local npx playwright test e2e/api/approval-rpc-race-condition.e2e.ts e2e/api/disbursement.e2e.ts e2e/api/disbursements-ledger.e2e.ts e2e/api/api-collections.e2e.ts e2e/api/api-notifications.e2e.ts e2e/api/api-audit.e2e.ts e2e/api/api-reconciliation.e2e.ts"
```

---

## Batch Results

### Batch A - UI Flow Cluster

- Result: **24 passed, 8 failed, 2 skipped** (34 total)
- Duration: ~11.3 minutes
- Failures: all in `e2e/backoffice-disbursement.e2e.ts`

Primary failure patterns:

- sidebar navigation click instability / out-of-viewport on `data-testid="sidebar-nav-loans"`
- missing disbursement CTA selectors (`[data-testid^="disburse-loan-"]`) in expected states
- downstream modal/form/disbursement-status tests failing because entry path did not complete

Notable skips:

- loan application submission path skipped due unmet KYC precondition
- duplicate disbursement prevention test skipped due missing eligible data state

### Batch B - API Flow Cluster

- Result: **14 passed, 61 failed, 4 skipped** (79 total)
- Duration: ~2.4 minutes
- Skips: all 4 tests in `e2e/api/approval-rpc-race-condition.e2e.ts`

Failure distribution:

- `e2e/api/api-audit.e2e.ts`: 11 failed
- `e2e/api/api-collections.e2e.ts`: 16 failed
- `e2e/api/api-notifications.e2e.ts`: 16 failed
- `e2e/api/api-reconciliation.e2e.ts`: 12 failed
- `e2e/api/disbursement.e2e.ts`: 6 failed

Primary failure patterns:

- widespread auth fixture failures: `Request rate limit reached` during user authentication in `e2e/fixtures.ts`
- several early authorization expectation mismatches (`expected 403`, `received 401`) before rate-limit saturation

---

## Flow Conformance Status (Phase 4 Evidence)

| Flow ID | Flow                      | Status                                             | Evidence Summary                                                                                                             |
| ------- | ------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| LF-01   | Loan Application          | `blocked`                                          | Form submission scenario skipped due KYC prerequisite unmet in test context                                                  |
| LF-02   | Admin Review and Approval | `pass`                                             | approvals UI tests in cluster passed                                                                                         |
| LF-03   | Disbursement              | `pass` (manual + IPS), `partial` (duplicate guard) | focused rerun: 9 passed, 1 skipped in `e2e/backoffice-disbursement.e2e.ts`; IPS path passes in `e2e/ips-payment-flow.e2e.ts` |
| LF-04   | Payments                  | `pass` (IPS), `partial` (non-IPS)                  | IPS customer/admin paths passed; non-IPS payment page not validated in this run                                              |
| LF-05   | Collections               | `fail`                                             | post-mitigation rerun shows deterministic contract failures (shape/status/500) in `e2e/api/api-collections.e2e.ts`           |
| LF-06   | Notifications             | `fail`                                             | post-mitigation rerun shows deterministic `404/500/401-vs-403` failures in `e2e/api/api-notifications.e2e.ts`                |
| LF-07   | Settlement/Reconciliation | `fail`                                             | rerun isolates deterministic role-negative mismatch (`expected 403`, `received 401`) in `e2e/api/api-reconciliation.e2e.ts`  |
| LF-08   | Audit and Compliance      | `fail`                                             | rerun isolates deterministic role-negative mismatch (`expected 403`, `received 401`) in `e2e/api/api-audit.e2e.ts`           |
| LF-09   | Budget & Finance          | `fail` (static gaps)                               | budget CTA actions (`Add Funds`, `New Goal`, `Filter/Export`) remain no-op in `src/pages/BudgetTracker.tsx`                  |

---

## Key Risks Identified

1. **Auth contract drift risk**: repeated `401` responses where tests and flow policy expect `403`.
2. **API contract drift risk**: response payload shape mismatches in analytics/collections endpoints.
3. **Notification service stability risk**: preferences/send/mark endpoints returning `404`/`500` under authenticated access.
4. **Static UI workflow gaps**: non-functional IPS trigger on `/payment` and budget CTA no-op buttons break documented user intent.

---

## Recommended Immediate Follow-up

1. Align API auth semantics and tests for negative-role access (`401` vs `403`) across audit/collections/reconciliation/disbursement orchestration endpoints.
2. Update API test assertions to current response contracts (analytics/collections payloads) or normalize API output to documented contract.
3. Fix notification endpoints returning `404/500` for authenticated preference/send/mark-read workflows.
4. Execute static-gap PR tasks in `docs/FLOW_FIX_PR_TASKS_2026-02-15.md` for IPS trigger and budget no-op actions.

---

## Trace Artifacts

Historical Phase 4 backoffice disbursement failures are archived under:

- `test-results/backoffice-disbursement.e2-*/error-context.md`
