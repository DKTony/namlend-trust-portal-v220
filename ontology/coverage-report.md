# Ontology coverage report

Commit: `a13c0dcad9208cb15b2c1e8c414957b4a5a7616d`

## Assurance summary

| Measure                                                              | Result |
| -------------------------------------------------------------------- | -----: |
| Required behavior/invariant mappings with named E0 test declarations |  18/18 |
| Effective Convex tables                                              |     96 |
| Application tables                                                   |     89 |
| Convex Auth tables                                                   |      7 |
| Indexes                                                              |    205 |
| Features / seeded plans                                              | 33 / 4 |
| Registered gaps                                                      |    144 |
| Resolved conflicts                                                   |     11 |

## Required behavior and invariants

These mappings are E0 evidence that an executable test is declared. Named passing results become E1 only in the current-SHA CI evidence artifact.

| Proof target             | Matching named E0 test declarations | Status  | Evidence                                                                              |
| ------------------------ | ----------------------------------: | ------- | ------------------------------------------------------------------------------------- |
| `approve`                |                                   2 | CURRENT | `evidence:78328e34a324e8df`, `evidence:82e4760579b1d445`                              |
| `APR_MAX_32`             |                                   2 | CURRENT | `evidence:0a4727ed61190a8d`, `evidence:2b652f607bce38c0`                              |
| `collect`                |                                   2 | CURRENT | `evidence:4fe39842d2f55c01`, `evidence:a401e62be2f26939`                              |
| `disburse`               |                                   2 | CURRENT | `evidence:a029350058513386`, `evidence:f357dd9168af39ad`                              |
| `FLAGS_DEFAULT_OFF`      |                                   1 | CURRENT | `evidence:4c623a21f7d59250`                                                           |
| `KYC`                    |                                   2 | CURRENT | `evidence:3161765b113bc4fd`, `evidence:957ea43036ae8049`                              |
| `KYC_REQUIRED`           |                                   2 | CURRENT | `evidence:957ea43036ae8049`, `evidence:b4c252993ac1269f`                              |
| `LEDGER_COMPLETION_ONLY` |                                   1 | CURRENT | `evidence:1240451ea230a155`                                                           |
| `LEDGER_IDEMPOTENT`      |                                   1 | CURRENT | `evidence:04262ea9be3fce03`                                                           |
| `LEDGER_REVERSAL`        |                                   1 | CURRENT | `evidence:34795a3a51ee0e30`                                                           |
| `notify`                 |                                   2 | CURRENT | `evidence:7f0f7c0672ec0a2f`, `evidence:ceb4c0979b1f8002`                              |
| `onboard`                |                                   2 | CURRENT | `evidence:c659248ca0a0fd70`, `evidence:df6d95677671b661`                              |
| `originate`              |                                   1 | CURRENT | `evidence:8de0068fb126017c`                                                           |
| `reconcile`              |                                   2 | CURRENT | `evidence:4bc411b9c877b067`, `evidence:fb014b31352577e2`                              |
| `repay`                  |                                   2 | CURRENT | `evidence:1240451ea230a155`, `evidence:16ac506abb1f6138`                              |
| `ROLE_LANDING`           |                                   2 | CURRENT | `evidence:ce05987e75b021e6`, `evidence:fd261e44b7b56723`                              |
| `settle`                 |                                   2 | CURRENT | `evidence:048596cd5d1f7378`, `evidence:4bc411b9c877b067`                              |
| `TENANT_ISOLATION`       |                                   3 | CURRENT | `evidence:4fe39842d2f55c01`, `evidence:92469678e6eda83e`, `evidence:fe0e472bfef925c7` |

## Table connectivity

| Table                                 | Readers | Writers | Status / exception                                                |
| ------------------------------------- | ------: | ------: | ----------------------------------------------------------------- |
| `table:profiles`                      |       2 |       5 | connected                                                         |
| `table:userRoles`                     |       3 |       8 | connected                                                         |
| `table:tenantInvites`                 |       3 |       3 | connected                                                         |
| `table:kycDocuments`                  |       2 |       3 | connected                                                         |
| `table:documentAccessGrants`          |       0 |       3 | GAP-9AE2A0BB6042                                                  |
| `table:loans`                         |      35 |       9 | connected                                                         |
| `table:loanDocuments`                 |       2 |       2 | connected                                                         |
| `table:loanApprovals`                 |       1 |       3 | connected                                                         |
| `table:disbursements`                 |      10 |       7 | connected                                                         |
| `table:paymentTransactions`           |       9 |       6 | connected                                                         |
| `table:paymentSchedules`              |       2 |       7 | connected                                                         |
| `table:rescheduleRequests`            |       2 |       2 | connected                                                         |
| `table:communications`                |       2 |       2 | connected                                                         |
| `table:supportTickets`                |       3 |       4 | connected                                                         |
| `table:paymentAllocations`            |       0 |       4 | GAP-7D0721F9D61D                                                  |
| `table:approvalRequests`              |       5 |       5 | connected                                                         |
| `table:approvalHistory`               |       0 |       4 | GAP-24582697D5BF                                                  |
| `table:workflowDefinitions`           |       2 |       2 | connected                                                         |
| `table:workflowInstances`             |       0 |       0 | GAP-AA1015CAC102                                                  |
| `table:notifications`                 |       1 |       7 | connected                                                         |
| `table:notificationTemplates`         |       1 |       0 | GAP-63620DA82BF7                                                  |
| `table:notificationQueue`             |       1 |       2 | connected                                                         |
| `table:notificationPreferences`       |       0 |       1 | GAP-512E383B3BA8                                                  |
| `table:communicationLogs`             |       0 |       0 | GAP-4DE4D174E8E0                                                  |
| `table:ipsTransactions`               |       8 |       6 | connected                                                         |
| `table:vpaRegistry`                   |       0 |       1 | GAP-5513CC12071A                                                  |
| `table:ipsApiLogs`                    |       0 |       1 | GAP-2E899E24A27D                                                  |
| `table:ipsAlerts`                     |       0 |       6 | GAP-E8EA4EBF9E5B                                                  |
| `table:ippRiskEvents`                 |       1 |       3 | connected                                                         |
| `table:ippHandleListings`             |       1 |       4 | connected                                                         |
| `table:ipsOnboardingApplications`     |      16 |      17 | connected                                                         |
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
| `table:tigerBeetleOutbox`             |       2 |      14 | connected                                                         |
| `table:tigerBeetleAccounts`           |       0 |       1 | GAP-1592DE439864                                                  |
| `table:tigerBeetleTransfers`          |       0 |       1 | GAP-D249B07F105A                                                  |
| `table:tigerBeetleReconciliation`     |       0 |       1 | GAP-0153FC69A0F7                                                  |
| `table:loanProcessingFailures`        |       0 |       1 | GAP-A17289C7879F                                                  |
| `table:auditLogs`                     |       0 |     146 | GAP-A3DA0E3C374C                                                  |
| `table:viewLogs`                      |       1 |       1 | connected                                                         |
| `table:stateTransitions`              |       1 |       1 | connected                                                         |
| `table:complianceReports`             |       0 |       1 | GAP-0EEB6CAF8B87                                                  |
| `table:ippComplianceEvidence`         |       0 |       7 | GAP-F565DE673FC4                                                  |
| `table:reconciliationRuns`            |       1 |       1 | connected                                                         |
| `table:bankTransactions`              |       3 |       4 | connected                                                         |
| `table:collectionsInteractions`       |       1 |       1 | connected                                                         |
| `table:overdueReminders`              |       1 |       1 | connected                                                         |
| `table:promiseToPay`                  |       4 |       2 | connected                                                         |
| `table:systemConfiguration`           |       2 |       3 | connected                                                         |
| `table:eventJournal`                  |       1 |     153 | connected                                                         |
| `table:snapshots`                     |       0 |       1 | GAP-039C753A8E3B                                                  |
| `table:relationships`                 |       1 |      24 | connected                                                         |
| `table:mandates`                      |      11 |       8 | connected                                                         |
| `table:mandateExecutions`             |       2 |       3 | connected                                                         |
| `table:consentRecords`                |       1 |       2 | connected                                                         |
| `table:institutions`                  |      44 |       6 | connected                                                         |
| `table:institutionDocuments`          |       1 |       1 | connected                                                         |
| `table:institutionConfig`             |       0 |       4 | GAP-D1CF003240B8                                                  |
| `table:platformAdmins`                |       3 |       3 | connected                                                         |
| `table:plans`                         |       4 |       2 | connected                                                         |
| `table:tenantSubscriptions`           |       0 |       3 | GAP-E4BAF2AD052C                                                  |
| `table:tenantEntitlements`            |       3 |       1 | connected                                                         |
| `table:featuresCatalog`               |       2 |       2 | connected                                                         |
| `table:platformGuardrails`            |       0 |       1 | GAP-F87A7F4D9DAF                                                  |
| `table:supportAccessAudit`            |       3 |       3 | connected                                                         |
| `table:paymentRails`                  |       4 |       4 | connected                                                         |
| `table:productDefinitions`            |       6 |       4 | connected                                                         |
| `table:productVersions`               |       2 |       2 | connected                                                         |
| `table:accounts`                      |       5 |       5 | connected                                                         |
| `table:portfolioMetrics`              |       0 |      11 | GAP-7320B29C86FA                                                  |
| `table:businessRules`                 |       1 |       7 | connected                                                         |
| `table:budgetEntries`                 |       0 |       2 | GAP-ED6C6DBA601B                                                  |
| `table:savingsGoals`                  |       1 |       2 | connected                                                         |
| `table:budgetLimits`                  |       0 |       1 | GAP-FA5356EE9894                                                  |
| `table:users`                         |       3 |       2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authSessions`                  |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authAccounts`                  |       0 |       2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRefreshTokens`             |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerificationCodes`         |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerifiers`                 |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRateLimits`                |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
