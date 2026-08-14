# Ontology coverage report

Commit: `2fd2b18486ed149d646a68e2323d56e34c7453c3`

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
| `approve`                |                                   2 | CURRENT | `evidence:4e7406f9f25bd955`, `evidence:b7fec5ebf1bfc36d`                              |
| `APR_MAX_32`             |                                   2 | CURRENT | `evidence:24638333867d72e6`, `evidence:5ec16376bf42cbb5`                              |
| `collect`                |                                   2 | CURRENT | `evidence:4258490bfa24458a`, `evidence:87a0aadbf3a37d15`                              |
| `disburse`               |                                   2 | CURRENT | `evidence:09991236eae4ba20`, `evidence:b22a2bbb74bc250e`                              |
| `FLAGS_DEFAULT_OFF`      |                                   1 | CURRENT | `evidence:6d6cf2eb0a09d90f`                                                           |
| `KYC`                    |                                   2 | CURRENT | `evidence:8add28ca979d3d56`, `evidence:c79618d93fdcbdbc`                              |
| `KYC_REQUIRED`           |                                   2 | CURRENT | `evidence:8add28ca979d3d56`, `evidence:ba2d5f9de18d4ee1`                              |
| `LEDGER_COMPLETION_ONLY` |                                   1 | CURRENT | `evidence:9fca362c55d22e18`                                                           |
| `LEDGER_IDEMPOTENT`      |                                   1 | CURRENT | `evidence:9e5611184e1d87da`                                                           |
| `LEDGER_REVERSAL`        |                                   1 | CURRENT | `evidence:196385ac213905a2`                                                           |
| `notify`                 |                                   2 | CURRENT | `evidence:5b2de0a6169fca15`, `evidence:bbbe6ac7fd818252`                              |
| `onboard`                |                                   2 | CURRENT | `evidence:8932a612fc41aa6a`, `evidence:8adadfa0ec93a308`                              |
| `originate`              |                                   1 | CURRENT | `evidence:8857038c18f7effd`                                                           |
| `reconcile`              |                                   2 | CURRENT | `evidence:1345093be5629c9b`, `evidence:978e05f243d5e597`                              |
| `repay`                  |                                   2 | CURRENT | `evidence:9fca362c55d22e18`, `evidence:e33019f8c60b1598`                              |
| `ROLE_LANDING`           |                                   2 | CURRENT | `evidence:042db093eccfcc86`, `evidence:dc60db3cbc7ee8ca`                              |
| `settle`                 |                                   2 | CURRENT | `evidence:1345093be5629c9b`, `evidence:3850f885044630a2`                              |
| `TENANT_ISOLATION`       |                                   3 | CURRENT | `evidence:4258490bfa24458a`, `evidence:5a6f62a4fc6ea47d`, `evidence:fe1e98628c76d02a` |

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
