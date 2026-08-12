# Ontology coverage report

Commit: `a662e089057d2167cf173419fbd8b67500731b01`

## Assurance summary

| Measure                                                              | Result |
| -------------------------------------------------------------------- | -----: |
| Required behavior/invariant mappings with named E0 test declarations |  18/18 |
| Effective Convex tables                                              |     91 |
| Application tables                                                   |     84 |
| Convex Auth tables                                                   |      7 |
| Indexes                                                              |    194 |
| Features / seeded plans                                              | 23 / 4 |
| Registered gaps                                                      |    155 |
| Resolved conflicts                                                   |      9 |

## Required behavior and invariants

These mappings are E0 evidence that an executable test is declared. Named passing results become E1 only in the current-SHA CI evidence artifact.

| Proof target             | Matching named E0 test declarations | Status  | Evidence                                                                              |
| ------------------------ | ----------------------------------: | ------- | ------------------------------------------------------------------------------------- |
| `approve`                |                                   2 | CURRENT | `evidence:29469e0756624849`, `evidence:c7d73ddbb28710cc`                              |
| `APR_MAX_32`             |                                   2 | CURRENT | `evidence:41798f5a87559b1a`, `evidence:a9ab28c12f0a5b3a`                              |
| `collect`                |                                   2 | CURRENT | `evidence:05dd540ba4551e45`, `evidence:7eae0bd5a68aa70c`                              |
| `disburse`               |                                   2 | CURRENT | `evidence:8b2f49ce2a995d3a`, `evidence:9cc36ba18e500386`                              |
| `FLAGS_DEFAULT_OFF`      |                                   1 | CURRENT | `evidence:1afb2e41f7a532c3`                                                           |
| `KYC`                    |                                   2 | CURRENT | `evidence:0f125f945c57c322`, `evidence:3974773b3d74c412`                              |
| `KYC_REQUIRED`           |                                   2 | CURRENT | `evidence:0f125f945c57c322`, `evidence:53297601f2ddc190`                              |
| `LEDGER_COMPLETION_ONLY` |                                   1 | CURRENT | `evidence:10c2d5f623472712`                                                           |
| `LEDGER_IDEMPOTENT`      |                                   1 | CURRENT | `evidence:3f028000dbea5f62`                                                           |
| `LEDGER_REVERSAL`        |                                   1 | CURRENT | `evidence:9552445ffdde44e1`                                                           |
| `notify`                 |                                   2 | CURRENT | `evidence:389753f91dbdc3f8`, `evidence:724c8f51bbc73952`                              |
| `onboard`                |                                   2 | CURRENT | `evidence:2ea07dcbbe9d8fe4`, `evidence:e1a3818cbe46848c`                              |
| `originate`              |                                   2 | CURRENT | `evidence:3d9501765e846011`, `evidence:c88f3e925697dbe5`                              |
| `reconcile`              |                                   2 | CURRENT | `evidence:02f13495ccdbeca1`, `evidence:b4b98d9bd9783522`                              |
| `repay`                  |                                   2 | CURRENT | `evidence:10c2d5f623472712`, `evidence:2b6b5c7e3984c793`                              |
| `ROLE_LANDING`           |                                   2 | CURRENT | `evidence:6d1c71e9e0cfb785`, `evidence:e451683dedbd2654`                              |
| `settle`                 |                                   2 | CURRENT | `evidence:02f13495ccdbeca1`, `evidence:37e8d0110260bd78`                              |
| `TENANT_ISOLATION`       |                                   3 | CURRENT | `evidence:05dd540ba4551e45`, `evidence:b8380d05f60922ea`, `evidence:d96cf6e6f3957495` |

## Table connectivity

| Table                                 | Readers | Writers | Status / exception                                                |
| ------------------------------------- | ------: | ------: | ----------------------------------------------------------------- |
| `table:profiles`                      |       2 |       4 | connected                                                         |
| `table:userRoles`                     |       2 |       7 | connected                                                         |
| `table:kycDocuments`                  |       2 |       3 | connected                                                         |
| `table:documentAccessGrants`          |       0 |       2 | GAP-8AE285F598FA                                                  |
| `table:loans`                         |      33 |       9 | connected                                                         |
| `table:loanDocuments`                 |       2 |       2 | connected                                                         |
| `table:loanApprovals`                 |       0 |       3 | GAP-D8F708FD4E34                                                  |
| `table:disbursements`                 |       9 |       6 | connected                                                         |
| `table:paymentTransactions`           |       8 |       6 | connected                                                         |
| `table:paymentSchedules`              |       2 |       7 | connected                                                         |
| `table:rescheduleRequests`            |       2 |       2 | connected                                                         |
| `table:communications`                |       2 |       2 | connected                                                         |
| `table:supportTickets`                |       3 |       4 | connected                                                         |
| `table:paymentAllocations`            |       0 |       4 | GAP-7D0721F9D61D                                                  |
| `table:approvalRequests`              |       5 |       5 | connected                                                         |
| `table:approvalHistory`               |       0 |       4 | GAP-24582697D5BF                                                  |
| `table:workflowDefinitions`           |       1 |       1 | connected                                                         |
| `table:workflowInstances`             |       0 |       0 | GAP-AA1015CAC102                                                  |
| `table:notifications`                 |       1 |       3 | connected                                                         |
| `table:notificationTemplates`         |       1 |       0 | GAP-63620DA82BF7                                                  |
| `table:notificationQueue`             |       1 |       2 | connected                                                         |
| `table:notificationPreferences`       |       0 |       1 | GAP-512E383B3BA8                                                  |
| `table:communicationLogs`             |       0 |       0 | GAP-4DE4D174E8E0                                                  |
| `table:ipsTransactions`               |       7 |       5 | connected                                                         |
| `table:vpaRegistry`                   |       0 |       1 | GAP-5513CC12071A                                                  |
| `table:ipsApiLogs`                    |       0 |       1 | GAP-2E899E24A27D                                                  |
| `table:ipsAlerts`                     |       0 |       6 | GAP-E8EA4EBF9E5B                                                  |
| `table:ippRiskEvents`                 |       1 |       3 | connected                                                         |
| `table:ippHandleListings`             |       1 |       4 | connected                                                         |
| `table:ipsOnboardingApplications`     |      16 |      16 | connected                                                         |
| `table:ipsDeviceBindings`             |       0 |       1 | GAP-73D98AC3584D                                                  |
| `table:ipsAliasDirectory`             |       4 |       7 | connected                                                         |
| `table:settlementParticipants`        |       2 |       2 | connected                                                         |
| `table:settlementWindows`             |       1 |       0 | GAP-509E5E4A37C1                                                  |
| `table:settlementHolidays`            |       1 |       0 | GAP-1964130F3CFA                                                  |
| `table:settlementFeeRules`            |       1 |       0 | GAP-E78676534A3D                                                  |
| `table:settlementRuns`                |       6 |       5 | connected                                                         |
| `table:settlementObligations`         |       1 |       1 | connected                                                         |
| `table:settlementExposures`           |       0 |       1 | GAP-1B00EC98F59D                                                  |
| `table:settlementNetInstructions`     |       1 |       1 | connected                                                         |
| `table:settlementPacs009Batches`      |       2 |       1 | connected                                                         |
| `table:settlementReports`             |       1 |       2 | connected                                                         |
| `table:settlementAdjustments`         |       4 |       4 | connected                                                         |
| `table:settlementTimeoutTransactions` |       3 |       2 | connected                                                         |
| `table:settlementAcknowledgements`    |       2 |       3 | connected                                                         |
| `table:ippDisputeCases`               |       1 |       2 | connected                                                         |
| `table:ippTransactionReceipts`        |       1 |       1 | connected                                                         |
| `table:tigerBeetleOutbox`             |       2 |      13 | connected                                                         |
| `table:tigerBeetleAccounts`           |       0 |       1 | GAP-1592DE439864                                                  |
| `table:tigerBeetleTransfers`          |       0 |       1 | GAP-D249B07F105A                                                  |
| `table:tigerBeetleReconciliation`     |       0 |       1 | GAP-0153FC69A0F7                                                  |
| `table:loanProcessingFailures`        |       0 |       1 | GAP-A17289C7879F                                                  |
| `table:auditLogs`                     |       0 |     121 | GAP-84A170209AD4                                                  |
| `table:viewLogs`                      |       0 |       1 | GAP-0184D120DA92                                                  |
| `table:stateTransitions`              |       0 |       1 | GAP-9C08D9903B2B                                                  |
| `table:complianceReports`             |       0 |       1 | GAP-0EEB6CAF8B87                                                  |
| `table:ippComplianceEvidence`         |       0 |       7 | GAP-F565DE673FC4                                                  |
| `table:reconciliationRuns`            |       1 |       1 | connected                                                         |
| `table:bankTransactions`              |       3 |       4 | connected                                                         |
| `table:collectionsInteractions`       |       1 |       1 | connected                                                         |
| `table:overdueReminders`              |       1 |       1 | connected                                                         |
| `table:promiseToPay`                  |       4 |       2 | connected                                                         |
| `table:systemConfiguration`           |       2 |       2 | connected                                                         |
| `table:eventJournal`                  |       1 |     128 | connected                                                         |
| `table:snapshots`                     |       0 |       1 | GAP-039C753A8E3B                                                  |
| `table:relationships`                 |       1 |      23 | connected                                                         |
| `table:mandates`                      |      11 |       8 | connected                                                         |
| `table:mandateExecutions`             |       2 |       3 | connected                                                         |
| `table:consentRecords`                |       1 |       2 | connected                                                         |
| `table:institutions`                  |      34 |       5 | connected                                                         |
| `table:institutionConfig`             |       0 |       3 | GAP-E015867F4922                                                  |
| `table:platformAdmins`                |       1 |       3 | connected                                                         |
| `table:plans`                         |       1 |       2 | connected                                                         |
| `table:tenantSubscriptions`           |       0 |       3 | GAP-E4BAF2AD052C                                                  |
| `table:tenantEntitlements`            |       1 |       1 | connected                                                         |
| `table:featuresCatalog`               |       0 |       1 | GAP-10D89A2362FB                                                  |
| `table:platformGuardrails`            |       0 |       1 | GAP-F87A7F4D9DAF                                                  |
| `table:supportAccessAudit`            |       3 |       3 | connected                                                         |
| `table:paymentRails`                  |       4 |       4 | connected                                                         |
| `table:productDefinitions`            |       4 |       4 | connected                                                         |
| `table:productVersions`               |       2 |       2 | connected                                                         |
| `table:accounts`                      |       5 |       5 | connected                                                         |
| `table:portfolioMetrics`              |       0 |      10 | GAP-99F4227C96F3                                                  |
| `table:businessRules`                 |       1 |       3 | connected                                                         |
| `table:users`                         |       2 |       2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authSessions`                  |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authAccounts`                  |       0 |       2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRefreshTokens`             |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerificationCodes`         |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerifiers`                 |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRateLimits`                |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
