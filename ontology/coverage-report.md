# Ontology coverage report

Commit: `6cf39da9c340a62b9a9a0e2567fbc1df60fc9339`

## Assurance summary

| Measure                                                              | Result |
| -------------------------------------------------------------------- | -----: |
| Required behavior/invariant mappings with named E0 test declarations |  18/18 |
| Effective Convex tables                                              |     92 |
| Application tables                                                   |     85 |
| Convex Auth tables                                                   |      7 |
| Indexes                                                              |    198 |
| Features / seeded plans                                              | 23 / 4 |
| Registered gaps                                                      |    148 |
| Resolved conflicts                                                   |      9 |

## Required behavior and invariants

These mappings are E0 evidence that an executable test is declared. Named passing results become E1 only in the current-SHA CI evidence artifact.

| Proof target             | Matching named E0 test declarations | Status  | Evidence                                                                              |
| ------------------------ | ----------------------------------: | ------- | ------------------------------------------------------------------------------------- |
| `approve`                |                                   2 | CURRENT | `evidence:544192b092ecdf44`, `evidence:9abc20cba0550511`                              |
| `APR_MAX_32`             |                                   2 | CURRENT | `evidence:103a9cdb5eaceee5`, `evidence:b0be56d6555ee392`                              |
| `collect`                |                                   2 | CURRENT | `evidence:cab81d59c981e0de`, `evidence:e7e7badccd93cba7`                              |
| `disburse`               |                                   2 | CURRENT | `evidence:3ab0da698c97f92f`, `evidence:509c9870ab76813f`                              |
| `FLAGS_DEFAULT_OFF`      |                                   1 | CURRENT | `evidence:cbd46306d965a4d7`                                                           |
| `KYC`                    |                                   2 | CURRENT | `evidence:14ab4b33799c05e3`, `evidence:994b97cc384828f8`                              |
| `KYC_REQUIRED`           |                                   2 | CURRENT | `evidence:5a5239908d044a6d`, `evidence:994b97cc384828f8`                              |
| `LEDGER_COMPLETION_ONLY` |                                   1 | CURRENT | `evidence:22c1dc6a6843f84b`                                                           |
| `LEDGER_IDEMPOTENT`      |                                   1 | CURRENT | `evidence:c464894901273172`                                                           |
| `LEDGER_REVERSAL`        |                                   1 | CURRENT | `evidence:d3ad54924c217833`                                                           |
| `notify`                 |                                   2 | CURRENT | `evidence:87edd4a75991ca7c`, `evidence:daddd674a48f8db1`                              |
| `onboard`                |                                   2 | CURRENT | `evidence:e7169d6791a2c5a5`, `evidence:eff1b2f154c79cef`                              |
| `originate`              |                                   2 | CURRENT | `evidence:1ad2fc9649ba7a27`, `evidence:6ed7fe46590b7832`                              |
| `reconcile`              |                                   2 | CURRENT | `evidence:881a36d9ed07c1dd`, `evidence:ed2baa27f794a18a`                              |
| `repay`                  |                                   2 | CURRENT | `evidence:22c1dc6a6843f84b`, `evidence:c34ec44630a9b2c7`                              |
| `ROLE_LANDING`           |                                   2 | CURRENT | `evidence:092484f89a30a8a7`, `evidence:79658956f9abbbdf`                              |
| `settle`                 |                                   2 | CURRENT | `evidence:ea96af82d4ff8e67`, `evidence:ed2baa27f794a18a`                              |
| `TENANT_ISOLATION`       |                                   3 | CURRENT | `evidence:3e09fa7659d32768`, `evidence:ab86fa8449dc6825`, `evidence:cab81d59c981e0de` |

## Table connectivity

| Table                                 | Readers | Writers | Status / exception                                                |
| ------------------------------------- | ------: | ------: | ----------------------------------------------------------------- |
| `table:profiles`                      |       2 |       4 | connected                                                         |
| `table:userRoles`                     |       2 |       7 | connected                                                         |
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
| `table:auditLogs`                     |       0 |     131 | GAP-DA44C3D36F67                                                  |
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
| `table:eventJournal`                  |       1 |     138 | connected                                                         |
| `table:snapshots`                     |       0 |       1 | GAP-039C753A8E3B                                                  |
| `table:relationships`                 |       1 |      24 | connected                                                         |
| `table:mandates`                      |      11 |       8 | connected                                                         |
| `table:mandateExecutions`             |       2 |       3 | connected                                                         |
| `table:consentRecords`                |       1 |       2 | connected                                                         |
| `table:institutions`                  |      39 |       6 | connected                                                         |
| `table:institutionDocuments`          |       1 |       1 | connected                                                         |
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
| `table:portfolioMetrics`              |       0 |      11 | GAP-7320B29C86FA                                                  |
| `table:businessRules`                 |       1 |       3 | connected                                                         |
| `table:users`                         |       2 |       2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authSessions`                  |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authAccounts`                  |       0 |       2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRefreshTokens`             |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerificationCodes`         |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerifiers`                 |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRateLimits`                |       0 |       0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
