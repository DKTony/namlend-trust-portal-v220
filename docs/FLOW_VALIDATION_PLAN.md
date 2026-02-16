# NamLend Trust - Flow Validation Plan

**Doc Revision**: 2026-02-14  
**Status**: Active

---

## Objective

Define a repeatable method to review all features and validate that every user action (button, card click, tab, menu action, modal confirm) follows the intended workflow in `docs/FLOWS.md`, including correct:

- next screen/phase navigation
- backend operation (service/RPC/table/Edge Function)
- role and compliance guardrails

---

## Scope

In scope:

- All flows listed in `docs/FLOWS.md` (LF-01 through LF-09)
- All role paths: `client`, `loan_officer`, `admin`
- UI transitions and backend side effects for each interactive action
- Function intent validation (what each action is meant to do)
- Documentation updates in `docs/`

Out of scope:

- visual redesign work
- non-functional performance tuning unrelated to flow correctness

---

## Source of Truth

Use these documents together during review:

- `docs/FLOWS.md` (expected end-to-end sequence)
- `docs/FUNCTIONALITY_MAP.md` (UI-service-RPC wiring)
- `docs/SERVICES.md` (function-level intent and side effects)
- `docs/TESTING.md` + `e2e/` (existing automated coverage)
- `docs/DATABASE_SCHEMA.md` (table/RLS expectations)

---

## Flow IDs

| Flow ID | Flow                        |
| ------- | --------------------------- |
| LF-01   | Loan Application Flow       |
| LF-02   | Admin Review and Approval   |
| LF-03   | Disbursement Flow           |
| LF-04   | Payments Flow               |
| LF-05   | Collections Flow            |
| LF-06   | Notifications Flow          |
| LF-07   | Settlement Flow             |
| LF-08   | Audit and Compliance        |
| LF-09   | Budget and Finance Tracking |

---

## Execution Plan

### Phase 1 - Build Canonical Matrix

1. Start from `docs/FLOW_VALIDATION_MATRIX.md`.
2. Expand each flow row into action-level rows (one row per clickable action).
3. Mark each row with: route, role, trigger control, expected transition, expected backend operation, and expected audit trail.

Gate to continue:

- every flow in `docs/FLOWS.md` has at least one matrix row

### Phase 2 - Inventory Interactive Controls

Run static discovery to capture all actions that must be validated:

```bash
rg -n "onClick=|navigate\\(|Link to=|<Button|data-testid=" src/pages src/components
```

For each control, record:

- UI element type (`button`, clickable `card`, menu item, modal action)
- trigger function and file reference
- role visibility conditions
- next destination/state

Gate to continue:

- no interactive control in scoped pages is missing from the matrix

### Phase 3 - Validate Function Intent

For each mapped action, document intent using this format:

- Intent: business outcome this action is meant to achieve
- Preconditions: role, KYC status, loan/disbursement/payment status
- Side effects: tables, RPCs, Edge Functions, notifications
- Compliance checks: APR <= 32%, NAD formatting, audit logging, RLS

Gate to continue:

- every action row has an explicit intent statement and side-effect mapping

### Phase 4 - Run Workflow Validation

1. Run current E2E suites by flow cluster.
2. Execute manual walkthroughs for actions not covered by E2E.
3. Verify each action reaches the expected next screen/state and operation from `docs/FLOWS.md`.

Suggested baseline test runs:

```bash
npx playwright test e2e/loan-application.e2e.ts e2e/admin-approvals.e2e.ts e2e/admin-approvals-actions.e2e.ts e2e/backoffice-disbursement.e2e.ts e2e/ips-payment-flow.e2e.ts e2e/role-routing.e2e.ts e2e/navigation-pages.e2e.ts
npx playwright test e2e/api/approval-rpc-race-condition.e2e.ts e2e/api/disbursement.e2e.ts e2e/api/disbursements-ledger.e2e.ts e2e/api/api-collections.e2e.ts e2e/api/api-notifications.e2e.ts e2e/api/api-audit.e2e.ts e2e/api/api-reconciliation.e2e.ts
```

Gate to continue:

- each matrix row has evidence (`e2e`, `api`, or manual proof)

### Phase 5 - Verify State and Data Integrity

For validated actions, confirm persisted effects:

- status transitions are correct (`pending -> under_review -> approved`, etc.)
- expected records are created/updated exactly once
- financial actions emit audit records
- role restrictions and RLS behavior are correct

Gate to continue:

- state-transition and data checks match expected flow definition

### Phase 6 - Gap Triage and Fix Loop

Classify mismatches:

- `P0`: wrong next phase/screen, broken financial operation, missing audit trail, privilege bypass
- `P1`: incorrect edge-state behavior, stale/ambiguous intent, weak validation
- `P2`: wording/doc drift without runtime impact

Each gap must include:

- reproduction steps
- expected vs actual behavior
- impacted flow IDs and functions
- owner and target fix PR

### Phase 7 - Documentation Update (Required Output)

After each review cycle, update:

- `docs/FLOWS.md` (actual flow behavior + known deviations)
- `docs/FUNCTIONALITY_MAP.md` (status: implemented/partial/drift)
- `docs/TESTING.md` (new/updated coverage)
- `docs/TECHNICAL_DEBT.md` (open P1/P2 gaps)
- `docs/FLOW_VALIDATION_MATRIX.md` (row-level status)

Also publish a dated summary:

- `docs/FLOW_VALIDATION_REPORT_YYYY-MM-DD.md`

---

## Initial Coverage Baseline (2026-02-14)

Initial baseline inferred from current `e2e/` suite naming:

- Strong coverage: loan application, approvals, disbursement, IPS payment paths, role routing, several API/RPC flows
- Partial coverage: notifications and collections are stronger at API level than UI level
- Likely gaps to prioritize: non-IPS payment page flow, settlement UI flow, budget tracker flow, full click-path validation for every dashboard card/action

Use this baseline only as a starting point; matrix evidence determines final status.

---

## Completion Criteria

Review cycle is complete only when:

1. every interactive action in scoped pages has a matrix row
2. every `docs/FLOWS.md` step has pass/fail evidence
3. every flow mismatch is documented with severity and owner
4. docs listed in Phase 7 are updated in the same change set
