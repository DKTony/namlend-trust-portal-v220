# Ontology coverage report

Commit: `d38bc135737783f3fb04f44da6232d1e6b66c682`

## Assurance summary

| Measure                                                              | Result |
| -------------------------------------------------------------------- | -----: |
| Required behavior/invariant mappings with named E0 test declarations |  18/18 |
| Effective Convex tables                                              |     95 |
| Application tables                                                   |     88 |
| Convex Auth tables                                                   |      7 |
| Indexes                                                              |    201 |
| Features / seeded plans                                              | 32 / 4 |
| Registered gaps                                                      |    144 |
| Resolved conflicts                                                   |     11 |

## Required behavior and invariants

These mappings are E0 evidence that an executable test is declared. Named passing results become E1 only in the current-SHA CI evidence artifact.

| Proof target             | Matching named E0 test declarations | Status  | Evidence                                                                              |
| ------------------------ | ----------------------------------: | ------- | ------------------------------------------------------------------------------------- |
| `approve`                |                                   2 | CURRENT | `evidence:11e63309fda47bdc`, `evidence:3ded82f013f4e253`                              |
| `APR_MAX_32`             |                                   2 | CURRENT | `evidence:03c6467f3b38e7df`, `evidence:f7643931f4c1de74`                              |
| `collect`                |                                   2 | CURRENT | `evidence:3085152b31c160d0`, `evidence:3f6fd2f97de45571`                              |
| `disburse`               |                                   2 | CURRENT | `evidence:7f4a843413dbf073`, `evidence:c47c1930e66599d5`                              |
| `FLAGS_DEFAULT_OFF`      |                                   1 | CURRENT | `evidence:edbf8921adc3249f`                                                           |
| `KYC`                    |                                   2 | CURRENT | `evidence:7297a35a9e43a65d`, `evidence:cf6b5da477e64526`                              |
| `KYC_REQUIRED`           |                                   2 | CURRENT | `evidence:7957150147421844`, `evidence:cf6b5da477e64526`                              |
| `LEDGER_COMPLETION_ONLY` |                                   1 | CURRENT | `evidence:c57252f9616f922a`                                                           |
| `LEDGER_IDEMPOTENT`      |                                   1 | CURRENT | `evidence:31358795f271b128`                                                           |
| `LEDGER_REVERSAL`        |                                   1 | CURRENT | `evidence:60d97c16eec597b9`                                                           |
| `notify`                 |                                   2 | CURRENT | `evidence:a0c3cbc7944e0756`, `evidence:d21daac0e2267b41`                              |
| `onboard`                |                                   2 | CURRENT | `evidence:78ec349c8ae6607d`, `evidence:a42187611ddfbf53`                              |
| `originate`              |                                   1 | CURRENT | `evidence:9e96c55357f17e24`                                                           |
| `reconcile`              |                                   2 | CURRENT | `evidence:29972a078d7f6930`, `evidence:a2ca20c119542e4b`                              |
| `repay`                  |                                   2 | CURRENT | `evidence:48872cc04777e761`, `evidence:c57252f9616f922a`                              |
| `ROLE_LANDING`           |                                   2 | CURRENT | `evidence:dde7435121f51bbe`, `evidence:f9b98b8cb6b61199`                              |
| `settle`                 |                                   2 | CURRENT | `evidence:29972a078d7f6930`, `evidence:b4c8c5f1f3b20136`                              |
| `TENANT_ISOLATION`       |                                   3 | CURRENT | `evidence:353051b1bdc026fa`, `evidence:3f6fd2f97de45571`, `evidence:499495271221fdc4` |

## Table connectivity

| Table                                 | Readers | Writers | Status / exception                                                |
| ------------------------------------- | ------: | ------: | ----------------------------------------------------------------- |
| `table:profiles`                      |       2 |       4 | connected                                                         |
| `table:userRoles`                     |       3 |       7 | connected                                                         |
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
| `table:auditLogs`                     |       0 |     141 | GAP-21E384E37E8B                                                  |
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
| `table:eventJournal`                  |       1 |     148 | connected                                                         |
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
