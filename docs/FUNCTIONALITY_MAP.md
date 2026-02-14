# NamLend Trust - Functionality Map

**Doc Revision**: 2026-01-19  \
**Purpose**: Feature to service and database wiring map (current codebase).

---

## Core Feature Map

| Feature | UI Entry | Services | Tables/RPCs | Status |
| --- | --- | --- | --- | --- |
| Auth & Roles | `Auth.tsx`, `useAuth.tsx` | `useAuth`, `roleManagementService` | `profiles`, `user_roles` | Implemented |
| Loan Application | `LoanApplication.tsx` | `approvalWorkflow` | `approval_requests` | Implemented |
| Admin Approval | `ApprovalManagementDashboard` | `approvalWorkflow` | `approval_requests_expanded`, `process_approval_transaction` | Implemented |
| Loan Records | Admin + client views | `loanService` | `loans` | Implemented |
| Disbursements | `DisbursementManager` | `disbursementService`, `disbursementsAPI` | `disbursements`, RPCs | Implemented |
| Payments (initiation) | `Payment.tsx` | RPC call | `create_payment` RPC, `payments` | Implemented |
| Payments (direct) | `PaymentModal` | `paymentService` | `process_loan_payment`, `payment_schedules` | Implemented |
| Payment Webhooks | Edge Function | `paymentGateway` | `payment_webhooks`, `payment_transactions` | Implemented |
| IPS Repayments/Disb. | IPS modals | `ipsService` | `ips_transactions`, `ips-adapter` | Mock adapter |
| IPP Onboarding | `BankingSection`, admin IPP | `ipsOnboardingService` | `ips_onboarding`, `ips_*` | Implemented (mock adapter) |
| Collections | `CollectionsDashboard` | `collectionsAPI` | `collections_interactions`, `promise_to_pay` | Implemented |
| Reconciliation | `ReconciliationDashboard` | `reconciliationService` (legacy) | `bank_transactions`, `payment_reconciliations` | Partial (schema drift) |
| Notifications | `NotificationCenter` | `notificationService` | `notifications`, `notification_queue` | Implemented |
| SMS/WhatsApp | Admin tools | `smsGateway`, `whatsappGateway` | `communication_logs` + Edge Functions | Wired, secrets needed |
| Audit Logs | Admin panels | `auditService` | `audit_logs`, `view_logs`, `state_transitions` | Implemented |
| Settlement | Admin reconciliation | `settlementService` | `settlement_*` RPCs | Implemented (no transport) |
| TigerBeetle | Admin ledger + outbox | `ledgerService` | `tigerbeetle_*` | Simulated posting |
| Budget Tracker | `BudgetTracker.tsx` | `financeService` | Mock data (pending tables) | Implemented (mock) |
| Credit Scoring | `CreditScoreDisplay` | `creditScoring` | Profile data | Partial (display-only) |
| KYC Verification | `KYC.tsx` | `useKYCEligibility` | `kyc_documents`, `document_verification_requirements` | Implemented |

---

## Notes on Partial Wiring

- `paymentGateway` is not currently used by the UI; payment flows use RPCs directly.
- `creditScoring` is not integrated into the loan application flow (display-only component exists).
- `financeService` uses mock data; Supabase tables pending for budget tracking.
- IPS adapter is mock; production integration requires secrets and mTLS.
- `/admin/*` route is admin-only in `ProtectedRoute`, despite loan officer UI logic.
- Reconciliation uses legacy tables; new `reconciliation_runs` schema + `api-reconciliation` are not yet wired into the UI.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [FLOWS.md](./FLOWS.md) - Transaction flow diagrams
- [SERVICES.md](./SERVICES.md) - Service layer details
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database tables
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
