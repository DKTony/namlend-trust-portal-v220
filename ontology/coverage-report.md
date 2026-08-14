# Ontology coverage report

Commit: `edf2cf642fe16f4b96ae08e776b8844cff113a8d`

## Assurance summary

| Measure                                                              | Result |
| -------------------------------------------------------------------- | -----: |
| Required behavior/invariant mappings with named E0 test declarations |  18/18 |
| Effective Convex tables                                              |     92 |
| Application tables                                                   |     85 |
| Convex Auth tables                                                   |      7 |
| Indexes                                                              |    198 |
| Features / seeded plans                                              | 32 / 4 |
| Registered gaps                                                      |    145 |
| Resolved conflicts                                                   |     11 |

## Required behavior and invariants

These mappings are E0 evidence that an executable test is declared. Named passing results become E1 only in the current-SHA CI evidence artifact.

| Proof target             | Matching named E0 test declarations | Status  | Evidence                                                                              |
| ------------------------ | ----------------------------------: | ------- | ------------------------------------------------------------------------------------- |
| `approve`                |                                   2 | CURRENT | `evidence:779289b8a3a0f86f`, `evidence:7f0dc217d585b527`                              |
| `APR_MAX_32`             |                                   2 | CURRENT | `evidence:3bafad2d2d668aca`, `evidence:4bfe23b0ba9a1217`                              |
| `collect`                |                                   2 | CURRENT | `evidence:82c5cd7226cf12e5`, `evidence:e85bbcad5639fc48`                              |
| `disburse`               |                                   2 | CURRENT | `evidence:d27ecbcd96730e6e`, `evidence:dce50c702e6bb0b1`                              |
| `FLAGS_DEFAULT_OFF`      |                                   1 | CURRENT | `evidence:53039f3aeb201040`                                                           |
| `KYC`                    |                                   2 | CURRENT | `evidence:23310de877c3fafd`, `evidence:4b73182d256c5ad4`                              |
| `KYC_REQUIRED`           |                                   2 | CURRENT | `evidence:4b73182d256c5ad4`, `evidence:a81845fa5b7277cc`                              |
| `LEDGER_COMPLETION_ONLY` |                                   1 | CURRENT | `evidence:b9a4d3703b3d0e3a`                                                           |
| `LEDGER_IDEMPOTENT`      |                                   1 | CURRENT | `evidence:af1c85f88cc33292`                                                           |
| `LEDGER_REVERSAL`        |                                   1 | CURRENT | `evidence:e53b450972f242bb`                                                           |
| `notify`                 |                                   2 | CURRENT | `evidence:190399567a9b0896`, `evidence:7745a6f778934fc6`                              |
| `onboard`                |                                   2 | CURRENT | `evidence:5e4e425d7db77490`, `evidence:92ed33928df16095`                              |
| `originate`              |                                   1 | CURRENT | `evidence:fd45b54ce692df5f`                                                           |
| `reconcile`              |                                   2 | CURRENT | `evidence:28ed6211243adf97`, `evidence:e583d3b8a9ec21da`                              |
| `repay`                  |                                   2 | CURRENT | `evidence:72faa7c93f801172`, `evidence:b9a4d3703b3d0e3a`                              |
| `ROLE_LANDING`           |                                   2 | CURRENT | `evidence:19c7603987833099`, `evidence:673ff9cb5a5555db`                              |
| `settle`                 |                                   2 | CURRENT | `evidence:d6012061ccabdf32`, `evidence:e583d3b8a9ec21da`                              |
| `TENANT_ISOLATION`       |                                   3 | CURRENT | `evidence:1db101e0168e115d`, `evidence:6a1cfc634fbf61a1`, `evidence:82c5cd7226cf12e5` |

## Table connectivity

| Table                                 | Readers | Writers | Status / exception                                                |
| ------------------------------------- | ------: | ------: | ----------------------------------------------------------------- |
| `table:profiles`                      |       2 |       4 | connected                                                         |
| `table:userRoles`                     |       3 |       7 | connected                                                         |
| `table:kycDocuments`                  |       2 |       3 | connected                                                         |
| `table:documentAccessGrants`          |       0 |       3 | GAP-9AE2A0BB6042                                                  |
| `table:loans`                         |      35 |       9 | connected                                                         |
| `table:loanDocuments`                 |       2 |       2 | connected                                                         |
| `table:loanApprovals`                 |       0 |       3 | GAP-D8F708FD4E34                                                  |
| `table:disbursements`                 |      10 |       7 | connected                                                         |
| `table:paymentTransactions`           |       9 |       6 | connected                                                         |
| `table:paymentSchedules`              |       2 |       7 | connected                                                         |
| `table:rescheduleRequests`            |       2 |       2 | connected                                                         |
| `table:communications`                |       2 |       2 | connected                                                         |
| `table:supportTickets`                |       3 |       4 | connected                                                         |
| `table:paymentAllocations`            |       0 |       4 | GAP-7D0721F9D61D                                                  |
| `table:approvalRequests`              |       5 |       5 | connected                                                         |
| `table:approvalHistory`               |       0 |       4 | GAP-24582697D5BF                                                  |
| `table:workflowDefinitions`           |       1 |       1 | connected                                                         |
| `table:workflowInstances`             |       0 |       0 | GAP-AA1015CAC102                                                  |
| `table:notifications`                 |       1 |       7 | connected                                                         |
| `table:notificationTemplates`         |       1 |       0 | GAP-63620DA82BF7                                                  |
| `table:notificationQueue`             |       1 |       2 | connected                                                         |
| `table:notificationPreferences`       |       0 |       1 | GAP-512E383B3BA8                                                  |
| `table:communicationLogs`             |       0 |       0 | GAP-4DE4D174E8E0                                                  |
| `table:ipsTransactions`               |       7 |       6 | connected                                                         |
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
| `table:tigerBeetleOutbox`             |       2 |      14 | connected                                                         |
| `table:tigerBeetleAccounts`           |       0 |       1 | GAP-1592DE439864                                                  |
| `table:tigerBeetleTransfers`          |       0 |       1 | GAP-D249B07F105A                                                  |
| `table:tigerBeetleReconciliation`     |       0 |       1 | GAP-0153FC69A0F7                                                  |
| `table:loanProcessingFailures`        |       0 |       1 | GAP-A17289C7879F                                                  |
| `table:auditLogs`                     |       0 |     136 | GAP-D5A40B98DEC8                                                  |
| `table:viewLogs`                      |       0 |       1 | GAP-0184D120DA92                                                  |
| `table:stateTransitions`              |       0 |       1 | GAP-9C08D9903B2B                                                  |
| `table:complianceReports`             |       0 |       1 | GAP-0EEB6CAF8B87                                                  |
| `table:ippComplianceEvidence`         |       0 |       7 | GAP-F565DE673FC4                                                  |
| `table:reconciliationRuns`            |       1 |       1 | connected                                                         |
| `table:bankTransactions`              |       3 |       4 | connected                                                         |
| `table:collectionsInteractions`       |       1 |       1 | connected                                                         |
| `table:overdueReminders`              |       1 |       1 | connected                                                         |
| `table:promiseToPay`                  |       4 |       2 | connected                                                         |
| `table:systemConfiguration`           |       2 |       3 | connected                                                         |
| `table:eventJournal`                  |       1 |     143 | connected                                                         |
| `table:snapshots`                     |       0 |       1 | GAP-039C753A8E3B                                                  |
| `table:relationships`                 |       1 |      24 | connected                                                         |
| `table:mandates`                      |      11 |       8 | connected                                                         |
| `table:mandateExecutions`             |       2 |       3 | connected                                                         |
| `table:consentRecords`                |       1 |       2 | connected                                                         |
| `table:institutions`                  |      40 |       6 | connected                                                         |
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
| `table:businessRules`                 |       1 |       5 | connected                                                         |
| `table:users`                         |       2 |       2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authSessions`                  |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authAccounts`                  |       0 |       2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRefreshTokens`             |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerificationCodes`         |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerifiers`                 |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRateLimits`                |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
