# End-to-End Wiring Audit — 15 August 2026

**Scope:** NamLend Trust web portal (React 18 + Vite SPA, Convex backend). Critical lending path first, then remaining operator dashboards.  
**Architecture kept:** Convex is the only application backend. UI uses `useQuery` / `useMutation` against `@/integrations/convex/api`. Authz lives in `convex/lib/auth.ts`. Financial writes keep audit + TigerBeetle outbox in the same mutation. No new `src/services/` business logic. No revived Supabase RPCs.  
**Pre-existing work left intact:** uncommitted `convex/institutionDocuments.ts` (+ tests, generated types, `.gitignore`). Those tests still pass.  
**Statuses** are used only with evidence from this pass. Existing docs (`FUNCTIONALITY_MAP.md` 2026-08-11, `FLOW_VALIDATION_MATRIX.md`, `AUDIT_REPORT.md` 2026-03-03) were treated as leads, not proof.

**Gates run this pass**

| Gate                                                                                                                                                           | Result                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npx vitest run --config vitest.convex.config.ts` (`lendingLifecycle`, `tenancy`, `documentWorkflow`, `hardening`, `payments.partial`, `institutionDocuments`) | **59 passed** (includes Wave E cross-tenant `getLoan`)                                                |
| `npx vitest run` (`KYC.test.tsx`, `implementationReview.test.ts`, `regulatory.test.ts`)                                                                        | **60 passed**                                                                                         |
| `npm run typecheck` (`tsc -b`)                                                                                                                                 | **pass**                                                                                              |
| `npm run lint`                                                                                                                                                 | **0 errors**, 20 pre-existing warnings (none introduced by this pass)                                 |
| Playwright (`ipp-lifecycle`, `document-workflow`, `login-smoke`, `admin-approvals-actions`)                                                                    | Wave C via `DOTENV_CONFIG_PATH=.env.e2e` — see section **K. Deferred waves (15 Aug, later same day)** |

`e2e/api/*.e2e.ts` still hit legacy Supabase Edge Functions and were **not** used as evidence.

---

## A. Executive Summary

The **core lending chain is real and persistent** in Convex: authenticated client creates a draft, `submitLoan` enforces verified KYC, staff see the same loan on the approval queue, approve funds the loan only after disbursement completion, client `recordPayment` does **not** post the ledger, staff `completePayment` writes a TigerBeetle outbox row and notifies the borrower. That chain is **VERIFIED** by `convex/lendingLifecycle.test.ts` plus existing KYC/document and payments tests.

Operator UI that previously **looked live but was not** has been repaired on this branch: IPP admin onboarding, batch in-app notifications, bulk loan approve/reject/review, overdue and collections tabs, compliance report generation, KPI/revenue placeholders, user analytics/activity/import/bulk, workflow definition update, and the budget tracker (new owner-scoped tables). Fake-success toasts (`setTimeout` then “sent”) were removed.

What remains incomplete is **external transport**, not Convex persistence: Bank of Namibia IPS defaults to `json_mock`, TigerBeetle outbox posting is shadow/simulated unless `TIGERBEETLE_MODE=live`, SMS/WhatsApp and password-reset mail need secrets, and Playwright UI journeys are **BLOCKED FROM VERIFICATION** without E2E fixtures. Session/DAU analytics are not stored; those screens now say so instead of inventing numbers.

Overall health: **functionally wired for the lending lifecycle and the operator surfaces that were faking success; live rails and browser E2E remain blocked.**

---

## B. Feature Wiring Matrix

| Feature                       | UI                                                 | API                                                | Backend                                   | Database                                        | Back Office                                     | Tested                                                      | Status                                                                                       |
| ----------------------------- | -------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Auth register / login         | `/auth` `Auth.tsx`                                 | Convex Auth Password/Google                        | `convex/auth.ts`                          | `users`, `profiles`, `userRoles`                | Role via `api.users.getMyRole`                  | `hardening.test.ts`; no Playwright login                    | **PARTIALLY IMPLEMENTED** — Convex Auth wired; browser session **BLOCKED FROM VERIFICATION** |
| Password reset                | `/auth` `flow: 'reset'`                            | Convex Auth reset                                  | `convex/auth.ts`                          | auth tables                                     | n/a                                             | No mail provider in env                                     | **BLOCKED FROM VERIFICATION**                                                                |
| Role assignment               | `/admin/users`                                     | `api.users.assignRole`                             | `users.ts`                                | `userRoles`                                     | Admin user mgmt                                 | Code + existing staff tests                                 | **VERIFIED** (assign); create/rename/delete roles honestly throw                             |
| KYC client submit             | `/kyc`                                             | `kycDocuments.*`                                   | `kycDocuments.ts`                         | `kycDocuments`, `profiles.kycStatus`            | Staff KYC review                                | `documentWorkflow.test.ts`, `KYC.test.tsx`                  | **VERIFIED** persistence; UI Playwright **BLOCKED**                                          |
| KYC staff review              | Approvals / client profile                         | `reviewDocument`, `completeReview`                 | `kycDocuments.ts`                         | same                                            | `/admin/approvals`                              | `documentWorkflow.test.ts`                                  | **VERIFIED**                                                                                 |
| Loan apply KYC gate           | `/loan-application` + `useKYCEligibility`          | `submitLoan`                                       | `assertKycVerifiedForUser`                | `loans`, `profiles`                             | n/a                                             | `lendingLifecycle` KYC_REQUIRED                             | **VERIFIED** — UI gate is UX; server enforces                                                |
| Create / submit loan          | `LoanApplication`                                  | `createLoan`, `submitLoan`                         | `loans.ts`                                | `loans`, `approvalRequests`                     | `/admin/approvals`                              | `lendingLifecycle`                                          | **VERIFIED** (APR ≤ 32% via `regulatory` tests)                                              |
| Approval queue → decide       | `/admin/approvals`                                 | `adminListApprovals`, `processApprovalRequest`     | `approvalWorkflow.ts` → `approveLoanCore` | `approvalRequests`, `loans`                     | same                                            | `lendingLifecycle` same loan id                             | **VERIFIED**; toast copy FIXED (“loan marked approved”)                                      |
| Reject loan                   | Approvals / loans                                  | `rejectLoan`                                       | `loans.ts`                                | `loans`, `loanApprovals`                        | same                                            | `lendingLifecycle` from-status                              | **FIXED** — only `submitted` \| `under_review` \| `approved`                                 |
| Disburse                      | Disbursement UI / loan actions                     | `initiateDisbursement`, `completeDisbursement`     | `disbursements.ts`                        | `disbursements`, `loans`, `tigerBeetleOutbox`   | staff                                           | `lendingLifecycle` client+staff see `funded`                | **VERIFIED** Convex; live IPS **BLOCKED**                                                    |
| Client repay                  | `/payment`, `PaymentModal`                         | `recordPayment`                                    | `payments.ts`                             | `paymentTransactions` pending                   | `/admin/payments`                               | `lendingLifecycle` outbox count 0 while pending             | **VERIFIED**                                                                                 |
| Staff confirm payment         | `PaymentsList`                                     | `completePayment`                                  | `payments.ts`                             | balances + outbox `REPAYMENT`                   | same loan on client + admin                     | `lendingLifecycle`, `payments.partial.test.ts`              | **VERIFIED**                                                                                 |
| In-app notifications          | client bell                                        | `getMyNotifications`                               | `notifications.ts`                        | `notifications`                                 | approve/disburse/pay side effects               | `lendingLifecycle` notes.length > 0                         | **VERIFIED** for lifecycle; batch send **FIXED**                                             |
| Loan documents                | Loan Details / Loan 360                            | `loanDocuments.*`                                  | `loanDocuments.ts`                        | `loanDocuments`, file storage                   | staff review                                    | `documentWorkflow.test.ts`                                  | **VERIFIED**                                                                                 |
| IPP client onboarding         | Dashboard Banking                                  | `api.ips.ipsOnboarding.*`                          | `ipsOnboarding.ts`                        | `ipsOnboardingApplications`                     | n/a                                             | existing hook path                                          | **PARTIALLY IMPLEMENTED** — Convex SM real; BoN **BLOCKED**                                  |
| IPP admin dashboard           | `/admin/ipp-onboarding`                            | `adminListOnboarding`, `adminStartOnboarding`      | `ipsOnboarding.ts`                        | same                                            | staff                                           | `lendingLifecycle` adminStartOnboarding                     | **FIXED** (was placeholder)                                                                  |
| Batch in-app notify           | `/admin/batch`                                     | `communications.sendCommunication`                 | `communications.ts`                       | `notifications`                                 | per loan owner                                  | static + mutation wiring                                    | **FIXED**; SMS/email disabled with “channel not configured”                                  |
| Bulk loan actions             | `/admin/loans`                                     | `approveLoan` / `rejectLoan` / `moveToReview`      | `loans.ts`                                | `loans`                                         | same                                            | parent dashboard now awaits mutations                       | **FIXED** (was setTimeout success)                                                           |
| Overdue tab                   | `/admin/payments` Overdue                          | `payments.getOverduePayments` `{ asOf }`           | `payments.ts`                             | `paymentSchedules` / loans                      | reminders via `sendCommunication`               | typecheck + query contract                                  | **FIXED** (was mock rows)                                                                    |
| Collections (payments tab)    | `/admin/payments` Collections                      | `api.collections.*`                                | `collections.ts`                          | PTP / interactions                              | `/admin/collections`                            | re-export of live workqueue                                 | **FIXED**                                                                                    |
| Collections route             | `/admin/collections`                               | `getCollectionsQueue`, `recordInteraction`         | `collections.ts`                          | same                                            | same                                            | already Convex; not re-run as new E2E                       | **PARTIALLY IMPLEMENTED** — Convex real; mandate soft-path warning                           |
| KPI / overview                | `/admin/overview`                                  | `analytics.getPortfolioSummary` etc.               | `analytics.ts`                            | loans/payments aggregates                       | n/a                                             | typecheck; no fake previous-period constants                | **FIXED** trends; chart is a **real monthly table**                                          |
| User analytics                | `/admin/users` Analytics                           | `getClientMetrics`, `listUsers`, `getAuditLogs`    | analytics/users/audit                     | profiles, auditLogs                             | n/a                                             | static                                                      | **FIXED** — no invented DAU/WAU                                                              |
| User activity                 | `/admin/users` Activity                            | `getAuditLogs`                                     | `audit.ts`                                | `auditLogs`                                     | n/a                                             | static                                                      | **FIXED** — honest “sessions not tracked”                                                    |
| Compliance reports            | Analytics                                          | `generateComplianceReport`, `getComplianceReports` | `audit.ts`                                | `complianceReports`                             | n/a                                             | `lendingLifecycle` status `completed`                       | **FIXED**                                                                                    |
| Budget tracker                | `/budget`                                          | `api.budget.*`                                     | `convex/budget.ts`                        | `budgetEntries`, `savingsGoals`, `budgetLimits` | n/a                                             | `lendingLifecycle` owner-scoped                             | **FIXED**                                                                                    |
| Workflow editor               | `/admin/workflows`                                 | `updateWorkflowDefinition`                         | `approvalWorkflow.ts`                     | `workflowDefinitions`                           | n/a                                             | `lendingLifecycle`                                          | **FIXED**                                                                                    |
| Alias lookup                  | IPS / payee                                        | `getAliasByAddr`                                   | `ipsAliasDirectory.ts`                    | `ipsAliasDirectory`                             | n/a                                             | `lendingLifecycle` redaction                                | **FIXED**                                                                                    |
| IPS alerts                    | IPS ops                                            | `createAlert`                                      | `ipsAlerts.ts`                            | `ipsAlerts`                                     | n/a                                             | code: tx exists + tenant staff                              | **FIXED** object-level check                                                                 |
| Institution registry UI       | `InstitutionsDashboard`                            | `ontology.institutions.*`                          | institutions                              | `institutions`                                  | **`/platform/tenants` is the mounted registry** | component unmounted from `/admin`                           | **PARTIALLY IMPLEMENTED** — Convex real; admin route not mounted (by design)                 |
| Tenant documents              | `/admin/tenant-info`, `/platform/tenants/:id/info` | `institutionDocuments.*`                           | `institutionDocuments.ts`                 | `institutionDocuments`                          | platform owner / tenant staff                   | `institutionDocuments.test.ts` (5)                          | **VERIFIED** (pre-existing + still passing)                                                  |
| Products / mandates / consent | `/admin/products`, `/mandates`, `/consent`         | ontology APIs                                      | ontology modules                          | products, mandates, consentRecords              | admin                                           | not re-executed this pass                                   | **PARTIALLY IMPLEMENTED** — Convex modules exist                                             |
| Platform console              | `/platform/*`                                      | `platform/*`                                       | tenants, plans, entitlements              | institutions, subscriptions                     | platform staff                                  | not re-executed this pass                                   | **PARTIALLY IMPLEMENTED**                                                                    |
| Reconciliation / settlement   | `/admin/reconciliation`, `/platform/settlement`    | `reconciliation.*`, settlement                     | Convex rows                               | settlementRuns etc.                             | simulate NISS in UI                             | Convex rows only                                            | **PARTIALLY IMPLEMENTED** — no live NTSL                                                     |
| TigerBeetle ledger            | `/platform/ledger`, TB config                      | outbox worker                                      | `tigerBeetleOutboxWorker`                 | `tigerBeetleOutbox`                             | connection test now honest                      | lifecycle outbox row **VERIFIED**; live cluster **BLOCKED** | **PARTIALLY IMPLEMENTED**                                                                    |
| SMS / WhatsApp                | Communications                                     | `sendSms` / `sendWhatsapp` actions                 | `actions/`                                | `communicationLogs`                             | batch UI refuses those channels                 | secrets unset                                               | **BLOCKED FROM VERIFICATION**                                                                |
| `DocumentVerificationSystem`  | unused component                                   | none                                               | n/a                                       | n/a                                             | not routed                                      | unused                                                      | **NOT WIRED** (not mounted; live KYC is `/kyc`)                                              |
| Admin invite mailer           | Add User dialog                                    | none                                               | n/a                                       | n/a                                             | honest error                                    | n/a                                                         | **NOT WIRED** — users must register at `/auth`                                               |
| Batch job history             | `/admin/batch`                                     | React state only                                   | n/a                                       | none                                            | refresh loses history                           | n/a                                                         | **PARTIALLY IMPLEMENTED** — sends are real; history is not persisted                         |

---

## C. Discrepancies Found

| Feature              | Location                                       | Expected                         | Actual (before)                                    | Root cause                      | Severity    | Fix                                                   | Verification                                       |
| -------------------- | ---------------------------------------------- | -------------------------------- | -------------------------------------------------- | ------------------------------- | ----------- | ----------------------------------------------------- | -------------------------------------------------- |
| IPP admin            | `IPPOnboardingDashboard.tsx`                   | List/start onboarding via Convex | Placeholder `'Onboarding initiated (placeholder)'` | UI never called `ipsOnboarding` | High        | `adminListOnboarding` + `adminStartOnboarding`        | `lendingLifecycle` adminStartOnboarding; typecheck |
| Batch notifications  | `BatchOperations.tsx`                          | Persist notifications            | `setTimeout` then toast “Notifications Sent”       | No Convex call                  | High        | `sendCommunication` in-app; SMS/email error           | Code review + typecheck                            |
| Bulk loans           | `BulkActionsPanel` / `LoanManagementDashboard` | Approve/reject/review persist    | Simulated delay + success toast                    | Parent did not await mutations  | High        | `bulkApproveLoan` / `bulkRejectLoan` / `moveToReview` | Code review                                        |
| Bulk users           | `BulkUserOperations.tsx`                       | Role/notify persist              | `setTimeout` simulate                              | No writes                       | High        | `assignRole` + `sendCommunication`                    | Code review                                        |
| User import          | `UserImportWizard` / dashboard                 | Create users or refuse           | Fake import                                        | Auth is Convex sign-up          | High        | Honest “CSV preview only”                             | Code review                                        |
| Overdue tab          | `OverdueManager.tsx`                           | Real overdue loans               | Hardcoded mock clients                             | Never queried Convex            | High        | `getOverduePayments({ asOf })`                        | Typecheck; query no longer uses `Date.now()`       |
| Collections tab      | `CollectionsCenter.tsx`                        | Same as collections module       | Separate mock dataset                              | Duplicate UI                    | High        | Re-export `CollectionsWorkqueue`                      | Code review                                        |
| Compliance           | `ComplianceReports.tsx`                        | Stored reports                   | Mock metrics + `alert()`                           | Stub generate                   | Medium      | `generateComplianceReport` computes + `completed`     | `lendingLifecycle`                                 |
| KPI trends           | `useKPIData.ts`                                | Real series or none              | Hardcoded 65 / 15000 / 8                           | Invented previous period        | Medium      | Snapshot copy from analytics                          | Typecheck                                          |
| Revenue chart        | `RevenueChart.tsx`                             | Real points or empty             | “Chart Temporarily Disabled”                       | recharts unused                 | Medium      | Monthly table from `getMonthlyTrends`                 | Typecheck                                          |
| User activity        | `UserActivityMonitor.tsx`                      | Real activity or empty           | `mockActiveUsers`                                  | No session store                | Medium      | `getAuditLogs` + honest presence copy                 | Typecheck                                          |
| User analytics       | `UserAnalytics.tsx`                            | Real metrics                     | Fake DAU/WAU/login counts                          | Invented engagement             | Medium      | Client metrics + audit action counts                  | Typecheck                                          |
| Budget               | `BudgetTracker.tsx`                            | Persist spend/goals              | `INITIAL_TRANSACTIONS`                             | No tables                       | Medium (R3) | `budgetEntries` / `savingsGoals` / `budgetLimits`     | `lendingLifecycle` ownership                       |
| Workflow update      | `WorkflowEditor.tsx`                           | Patch definition                 | Create-only; update warned                         | Missing mutation                | Medium      | `updateWorkflowDefinition`                            | `lendingLifecycle`                                 |
| `rejectLoan`         | `loans.ts`                                     | State machine                    | Any status could reject                            | Missing from-status             | High        | Allow only submitted/under_review/approved            | `lendingLifecycle` INVALID_STATE after funded      |
| `getAliasByAddr`     | `ipsAliasDirectory.ts`                         | No PII leak                      | Full row to any authed user                        | Missing redaction               | High        | Non-owner gets `{ addr, status }`                     | `lendingLifecycle`                                 |
| `createAlert`        | `ipsAlerts.ts`                                 | Object-level authz               | Staff-only, no tenant/tx check                     | A-01 leftover                   | Medium      | Tx must exist; `assertOwnerOrTenantStaff`             | Code review                                        |
| Approval toast       | `ApprovalManagementDashboard.tsx`              | Accurate copy                    | “loan created” on approve                          | Misleading UX                   | Low         | “loan marked approved”                                | Code review                                        |
| Disburse amount      | `useLoanActions.ts`                            | Principal amount                 | `amount: 0` possible                               | Caller omitted amount           | High        | `disburseLoan(loanId, amount)` required               | Code review                                        |
| TB “Test connection” | `useTigerBeetleConfig.ts`                      | Probe or refuse                  | Simulated success after 1.5s                       | Fake probe                      | Medium      | Destructive toast: cluster not probed                 | Code review                                        |
| Bulk Export/Notify   | `BulkActionsPanel.tsx`                         | Action or hidden                 | Dead buttons                                       | Unwired chrome                  | Low         | Disabled with title                                   | Code review                                        |
| Loan review delay    | `LoanReviewPanel.tsx`                          | Call parent                      | 1s sleep then callback                             | Cosmetic fake latency           | Low         | Await parent; component still **unmounted**           | Code review                                        |
| `getOverduePayments` | `payments.ts`                                  | Deterministic query              | Would have used clock in query                     | Convex query rule               | Medium      | Client passes `asOf`                                  | Typecheck                                          |

---

## D. Missing Implementations

Visual or labelled features that still have **no** full implementation (or are intentionally refused):

1. **Admin invite / account-provisioning mailer** — Add User and CSV import cannot create Convex Auth users. Operators must send people to `/auth`.
2. **Custom role CRUD** — Roles are code-defined (`client`, `loan_officer`, `admin`, `tenant_admin`). UI throws rather than inventing a role table.
3. **Live session / DAU / bounce / retention analytics** — not stored. Screens now show audit snapshots instead of fake charts.
4. **Historical monthly registration series** — not stored; copy says to use 30-day new-user count.
5. **Batch job history persistence** — job list is React state; refresh loses it. Sends themselves persist as notifications.
6. **Bulk CSV export / Notify** on the loan bulk bar — disabled; notify lives on `/admin/batch`.
7. **`DocumentVerificationSystem.tsx`** — unused fake-upload component; live path is `/kyc`.
8. **`LoanReviewPanel.tsx`** — not imported by any route (approvals use `ApprovalManagementDashboard`).
9. **`InstitutionsDashboard`** — not on `/admin` or `/platform` routes; live registry is `/platform/tenants`.
10. **HSM IPS signing, live BoN mTLS, live TigerBeetle TCP, NTSL settlement transport** — out of scope; mock/shadow labelled.
11. **Password-reset email delivery** — UI mode exists; mail provider not configured here.

---

## E. Database Issues

| Item               | Detail                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Added this pass    | `budgetEntries`, `savingsGoals`, `budgetLimits` (indexes `by_userId`) in `convex/schema.ts`                                                   |
| Retention          | Application code still does not hard-delete financial rows. Tests may.                                                                        |
| Query clock        | `getOverduePayments` now requires `asOf` so the query stays deterministic                                                                     |
| Outbox units       | Lifecycle test asserts repayment outbox exists only after `completePayment` (cents producer unchanged)                                        |
| Tenancy            | `convex/lib/tenancy.ts` remains Phase-0 resolve; object-level `assertOwnerOrTenantStaff` is what isolates records. Not a full RLS equivalent. |
| Compliance reports | Previously inserted `pending` stubs; now persist computed `reportData` with `status: 'completed'`                                             |
| Unchanged risk     | Fire-and-forget `scheduleAuditLog` can lag the domain write (by design)                                                                       |

---

## F. API Issues

| Item                         | Detail                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Added                        | `api.budget.*` (list/create/import/addFunds/upsertLimit), `api.ips.ipsOnboarding.adminStartOnboarding`, `api.approvalWorkflow.updateWorkflowDefinition` |
| Changed                      | `getOverduePayments` args include `asOf`; admin onboarding list enriches email/name/phone                                                               |
| `getAliasByAddr`             | Return type is full alias **or** `{ addr, status }` for strangers                                                                                       |
| `createAlert`                | Rejects unknown `transactionId`; tenant-scopes when tx has `userId` / `institutionId`                                                                   |
| Unused / leftover            | `e2e/api/*` still documents Supabase RPCs (`submitApprovalRequest`, `create_payment`) — **not** live APIs                                               |
| Public unauthenticated       | `authProviders.listEnabled`, `systemConfig.getPublicConfig` (public rows only) — unchanged, by design                                                   |
| `isEntitlementEnforcementOn` | Unauthenticated boolean kill-switch — unchanged                                                                                                         |

---

## G. Security & Permission Issues

| Item                              | Result this pass                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthenticated `createLoan`      | **VERIFIED** rejected (`lendingLifecycle`)                                                                                                                                   |
| Client `approveLoan`              | **VERIFIED** rejected                                                                                                                                                        |
| `submitLoan` without verified KYC | **VERIFIED** `KYC_REQUIRED`; loan stays `draft`                                                                                                                              |
| `rejectLoan` after `funded`       | **VERIFIED** `INVALID_STATE`                                                                                                                                                 |
| Alias directory                   | **FIXED** — non-owner redacted                                                                                                                                               |
| IPS `createAlert`                 | **FIXED** — transaction existence + tenant staff when bound                                                                                                                  |
| Frontend `ProtectedRoute`         | UX only; server `assert*` remains authoritative                                                                                                                              |
| Cross-tenant staff                | **FIXED** Wave E — `assertOwnerOrTenantStaff` on public financial/IPS functions; `getLoan` denied across tenants without the `TENANCY_ENFORCEMENT` flag (`lendingLifecycle`) |
| Platform dual-hat tenant-info     | Left to existing `institutionDocuments` uncommitted fix; tests still pass                                                                                                    |

---

## H. Fixes Implemented

**Backend**

- `rejectLoan` (and workflow reject) only from `submitted` \| `under_review` \| `approved`
- `updateWorkflowDefinition` public mutation
- `getAliasByAddr` redaction
- `generateComplianceReport` computes and stores completed `reportData`
- `getOverduePayments` requires `asOf`; enriches client name, remaining, days overdue, risk
- `createAlert` verifies transaction + tenant
- In-app `sendCommunication` awaits notification create
- `adminListOnboarding` enrichment; `adminStartOnboarding`
- Schema + `convex/budget.ts` owner-scoped budget APIs
- `convex/lendingLifecycle.test.ts` covering J1–J6 and remaining-surface fixes

**Frontend**

- IPP admin dashboard on live Convex APIs; no fake provider refresh success
- Batch notifications: in-app only; other channels error
- Bulk loan/user actions call Convex; no `setTimeout` success
- Overdue + collections tabs on real queries
- Overview KPIs/revenue from analytics (table, not a fake chart)
- User activity/analytics/compliance on audit + analytics
- User profile no John Doe fallback; add-user/import honest
- Workflow editor update mutation
- Budget tracker hydrates from Convex
- TigerBeetle connection test no longer claims a live TCP session
- Bulk Export/Notify disabled with an explanation
- Approval success toast wording
- Ledger dashboard Process Queue / Run Reconciliation no longer sleep-then-succeed; buttons disabled with worker copy
- IPS health “manual check” no longer toasts success for a no-op probe
- `DocumentVerificationSystem` no longer fakes a successful upload

**Authz (Wave E)**

- `assertOwnerOrTenantStaff` / `assertOwnerOrTenantStaffForUser` on remaining public financial and IPS `assertOwnerOrStaff` call sites
- Cross-tenant `getLoan` denial without `TENANCY_ENFORCEMENT`

---

## I. Remaining Blockers

Only items that cannot be completed from this repository without external credentials or infrastructure:

1. **Playwright UI journeys** — `.env.e2e` has admin creds, but `VITE_CONVEX_URL` is the retired shared deployment (`brave-mole-108`); `e2e/setupSafety.ts` refuses it. Local `.env` is production (`aromatic-okapi-265`), also refused. Specs that `test.skip` without KYC seed are not evidence.
2. **Live Bank of Namibia IPS** — certificates, mTLS, production `IPS_PROTOCOL_MODE`. Default remains `json_mock`.
3. **Live TigerBeetle cluster** — `TIGERBEETLE_MODE=live` + non-local `TIGERBEETLE_HTTP_URL`. Outbox **rows** are verified; cluster posting is not.
4. **SMS / WhatsApp** — Convex env secrets unset; batch UI refuses those channels.
5. **Password-reset / invite email** — no mail provider configured.
6. **NTSL / NISS settlement transport** — Convex settlement rows exist; live clearing is not connected.

---

## J. Final Verification

### Executed end-to-end in `convex-test` (same loan id, client + staff)

`convex/lendingLifecycle.test.ts` → “same loan is visible to staff and client through disbursement and repayment”:

1. Client `createLoan` (NAD 10,000, 20% APR, 12 months) → `draft`
2. Client `submitLoan` → `submitted`; staff `adminListApprovals` contains that `entityId`
3. Internal credit score + `createSystemApprovalRequest`
4. Staff `processApprovalRequest` `approve` → `loans.status = approved`
5. Staff `initiateDisbursement` amount **10000** + `completeDisbursement` → `funded`
6. Client `getMyLoans` and staff `adminListLoans` both contain the loan
7. Client `recordPayment` 1000 → **zero** `tigerBeetleOutbox` rows for that payment
8. Staff `completePayment` → **one** outbox row
9. Scheduled work flushed → client `getMyNotifications` length > 0
10. Staff `rejectLoan` after funded → `INVALID_STATE`

Additional proofs in the same file: unauthenticated create, client cannot approve, KYC gate, reject from `submitted`, alias redaction, compliance report `completed`, IPP `adminStartOnboarding`, budget owner isolation, `updateWorkflowDefinition`.

KYC file metadata / submit / review: `convex/documentWorkflow.test.ts` (10) and `src/pages/KYC.test.tsx` (4).  
Payments/IPS schedule: `convex/payments.partial.test.ts` (7).  
Authz hardening suite: `convex/hardening.test.ts` (18).  
Tenant documents: `convex/institutionDocuments.test.ts` (5).

### Not executed (do not treat as VERIFIED)

- Browser click-through of `/auth` → `/kyc` → `/loan-application` → `/admin/approvals` → disbursement → `/payment`
- Live IPS, SMS, mail, TigerBeetle HTTP posting
- Full walk of every platform console write (plans, entitlements, support tickets)

### Residual risk

Operator screens that still persist only in React state (batch job history) or that sit on mock IPS/TB transports can look “green” in a demo while the external system did not move. This pass labels those **PARTIALLY IMPLEMENTED** or **BLOCKED FROM VERIFICATION** rather than VERIFIED.

---

## K. Deferred waves (15 Aug 2026, second pass)

Chosen: **B** (inventory/docs) + **A** (fake-success UI) + **E** (authz) + **C** (Playwright via `.env.e2e`). **D skipped** (no live IPS/TB/SMS/mail secrets). `convex/institutionDocuments.ts` was not clobbered.

### Wave E — Authz / tenancy

Public financial and IPS functions that used `assertOwnerOrStaff` now call `assertOwnerOrTenantStaff` when the row has `institutionId`, or `assertOwnerOrTenantStaffForUser` (looks up `userRoles.institutionId`) when it does not.

Touched: `loans.getLoan`, `payments.*` (4), `disbursements.getDisbursementsByLoan`, `loanApprovals.getLoanApprovals`, `approvalWorkflow` loan paths, `users.getUserProfile`, `ontology/mandates.createMandate`, `ontology/accounts` owner paths, `ipsAliasDirectory` (lookup still redacts strangers; writes tenant-scoped), `ipsOnboarding` (11), `ippOperations.listReceipts`.

Helpers added on `convex/lib/auth.ts`: `institutionIdForUser`, `assertOwnerOrTenantStaffForUser`.

**VERIFIED:** `lendingLifecycle` “staff from another tenant cannot getLoan even when TENANCY_ENFORCEMENT is off”. Existing `tenancy.test.ts` still passes (list isolation remains flag-gated; object get is always tenant-bound).

### Wave A — Exhaustive UI (fake-success only)

| Surface                                                                      | Before                                          | After                                                             |
| ---------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| `LedgerDashboard` Process Queue / Run Reconciliation                         | 1s sleep, looked like a drain                   | Disabled; copy says the 30s internal worker owns posting          |
| `IPSHealthWidget` refresh                                                    | Success toast “Check complete” with no probe    | Disabled; tooltip says health is already reactive                 |
| `DocumentVerificationSystem` upload                                          | Toast “Document Uploaded” with no storage write | Destructive toast: use `/kyc`; banner that the panel is unmounted |
| `RoleManagement` lock/unlock                                                 | Local `isActive` flip looked persisted          | Disabled; roles stay code-defined                                 |
| Payments/clients/loans/users Export, Add Client, Bulk Edit, Advanced Filters | Dead buttons                                    | Disabled with title                                               |
| User profile 2FA / login notify / force reset                                | Uncontrolled switches + button                  | Disabled; mail/2FA not configured                                 |
| `IPSTransactionStatus` Retry Payment                                         | Dead button on failed retryable txs             | Disabled; start a new IPS payment                                 |
| Payment/Client overview `+12%` trends                                        | Invented vs live card values                    | Trend strings removed                                             |

Not built (plan): invite mailer, DAU analytics, persisted batch job history. Unmounted AnalyticsDashboard / Loan360 leftovers left unmounted.

Collections expanded history was already on `listInteractionsByLoan` (FUNCTIONALITY_MAP placeholder was stale).

### Wave B — Inventory artifact

- Rewrote `docs/FLOW_VALIDATION_MATRIX.md` to Convex `api.*`. `e2e/api/*` and Supabase RPCs are explicitly **not** evidence.
- Control-level remainder listed (not a frozen every-button matrix).
- Unused public export scan: **354** public functions; **146** have no `api.<module>.<name>` string in `src/`. Highest-signal unused siblings: `initiateIpsTransaction` / `initiateIpsDisbursement` (UI uses `initiateIpsRepayment` / `startLoanDisbursement`); `ipsAliasDirectory.*` vs onboarding `registerAlias`; `users.generateKycUploadUrl` vs `kycDocuments.*`; most `ontology.mandates|consent|products` and `settlement.*`.

### Wave C — Browser proof

Attempted: `DOTENV_CONFIG_PATH=.env.e2e npm run test:e2e:staging -- e2e/login-smoke.e2e.ts e2e/document-workflow.e2e.ts e2e/admin-approvals-actions.e2e.ts e2e/ipp-lifecycle.e2e.ts`

`.env.e2e` has admin email/password **and** `VITE_CONVEX_URL`, but that URL is `https://brave-mole-108.convex.cloud`. Playwright `e2e/setupSafety.ts` **refuses** the retired shared E2E deployment (and also refuses production `aromatic-okapi-265`, which is what `.env` / `.env.local` point at). No disposable preview URL is in the local env files.

| Spec                      | Result                          | Status used in this pack                                                                       |
| ------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `login-smoke`             | not started — globalSetup threw | **BLOCKED FROM VERIFICATION**                                                                  |
| `document-workflow`       | not started — same              | **BLOCKED FROM VERIFICATION** (mutation journey also requires `E2E_ENABLE_DOCUMENT_MUTATIONS`) |
| `admin-approvals-actions` | not started — same              | **BLOCKED FROM VERIFICATION**                                                                  |
| `ipp-lifecycle`           | not started — same              | **BLOCKED FROM VERIFICATION** (would also skip without KYC-complete client)                    |

Skip/blocked ≠ VERIFIED. Need a disposable Convex preview + seeded E2E users, not the retired shared deployment and not production.

### Wave D — not run

Live BoN IPS, `TIGERBEETLE_MODE=live`, SMS/WhatsApp, mail.

### Unused public Convex exports (grouped)

Ontology / settlement (expected; UI incomplete): `ontology.accounts.*`, `ontology.mandates.*`, `ontology.consentRecords.*`, `ontology.products.*` (most), `ontology.paymentRails.*`, `ontology.eventJournal.*`, `ontology.relationships.*`, `ontology.snapshots.*`, `settlement.*`.

Superseded by a sibling the UI calls: `ips.ipsTransactions.initiateIpsTransaction`, `initiateIpsDisbursement`, `updateIpsTransactionStatus`, `getTransactionByMsgId`; `ips.ipsAliasDirectory.*`; `users.generateKycUploadUrl`, `users.recordKycDocument`; `approvalWorkflow.submitForApproval`, `getApprovalRequest`; `budget.createBudgetEntry`, `upsertBudgetLimit`.

Staff/ops with no mounted control in this pass: `loanProcessing.*`, `kycDocuments.getLegacyRemediationQueue`, `loanDocuments.getLegacyRemediationQueue`, `ippOperations.createDisputeCase`, `createHandleListing`, `reconciliation.createReconciliationRun` / dispute / exclude, `tigerbeetle.accounts.createTigerBeetleAccount`, `tigerbeetle.reconciliation.recordReconciliation`, `systemConfig.seedDefaultConfig` / `deleteConfig`.
