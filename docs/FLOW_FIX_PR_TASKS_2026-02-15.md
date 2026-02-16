# Flow Fix PR Tasks (2026-02-15)

**Doc Revision**: 2026-02-15  
**Status**: Active  
**Scope**: Convert static flow gaps into executable PR tasks with owner and severity

---

## Task Backlog

| Task ID               | Gap                                                  | Flow Step   | Severity | Owner                 | PR Scope                                                                                                                               | Acceptance Criteria                                                                                                   | Validation                                                                             |
| --------------------- | ---------------------------------------------------- | ----------- | -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `FLOW-FIX-IPS-001`    | Payment page IPS option does not launch IPS workflow | `LF-04-S06` | `high`   | `Frontend - Payments` | Wire IPS selection in `src/pages/Payment.tsx` to open IPS modal flow (`showIPSModal`) and keep existing non-IPS behavior intact        | Selecting IPS on `/payment` opens IPS modal and reaches repay action; no regression to existing `create_payment` path | Add/extend E2E for `/payment` IPS branch + pass existing `e2e/ips-payment-flow.e2e.ts` |
| `FLOW-FIX-BUDGET-001` | `+ Add Funds` button is no-op                        | `LF-09-S03` | `high`   | `Frontend - Budget`   | Implement `onClick` action in `src/pages/BudgetTracker.tsx` to launch goal-funding workflow (modal or routed action)                   | Clicking `+ Add Funds` triggers a visible workflow and updates UI state after submit/cancel                           | Add UI test covering click -> workflow open -> close/update                            |
| `FLOW-FIX-BUDGET-002` | `add-savings-goal` button is no-op                   | `LF-09-S04` | `high`   | `Frontend - Budget`   | Implement new-goal creation entrypoint in `src/pages/BudgetTracker.tsx` and persist via budget service contract                        | Clicking `New Goal` opens goal form; successful submit adds goal card; validation errors are surfaced                 | Add UI test for create-goal happy path + invalid form path                             |
| `FLOW-FIX-BUDGET-003` | Transactions `Filter` / `Export` controls are no-op  | `LF-09-S05` | `medium` | `Frontend - Budget`   | Wire filter controls to transaction query state and implement export action (CSV download or explicit placeholder with disabled state) | Filter modifies displayed transaction set; Export triggers deterministic file/action (or disabled with rationale)     | Add test for filter state effect and export action availability                        |

---

## Assignment Notes

- Owners are role-based placeholders; map them to named assignees in the PR tracker.
- Each task should include a linked test update in the same PR to preserve flow conformance.
