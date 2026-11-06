# Ontology coverage report

Commit: `f00c156c41a64496fc32474764cff3e34f573b8e`

## Assurance summary

| Measure | Result |
| --- | ---: |
| Required behavior/invariant mappings with named E0 test declarations | 18/18 |
| Effective Convex tables | 99 |
| Application tables | 92 |
| Convex Auth tables | 7 |
| Indexes | 210 |
| Features / seeded plans | 32 / 4 |
| Registered gaps | 150 |
| Resolved conflicts | 11 |

## Required behavior and invariants

These mappings are E0 evidence that an executable test is declared. Named passing results become E1 only in the current-SHA CI evidence artifact.

| Proof target | Matching named E0 test declarations | Status | Evidence |
| --- | ---: | --- | --- |
| `approve` | 2 | CURRENT | `evidence:0c294fed59a9f9c3`, `evidence:bb7a1236595f2b67` |
| `APR_MAX_32` | 2 | CURRENT | `evidence:05e09e78e80bc8ff`, `evidence:4add6dec636dea4a` |
| `collect` | 2 | CURRENT | `evidence:97331060658cf43c`, `evidence:df13c46acd3ef073` |
| `disburse` | 2 | CURRENT | `evidence:c20de8eff3573cc6`, `evidence:c5d732b469bde9c9` |
| `FLAGS_DEFAULT_OFF` | 1 | CURRENT | `evidence:7b9af05a29db27bd` |
| `KYC` | 2 | CURRENT | `evidence:c28540ec229bfc93`, `evidence:d1f1bce4b1ff0242` |
| `KYC_REQUIRED` | 2 | CURRENT | `evidence:b68eb1a70d61c173`, `evidence:c28540ec229bfc93` |
| `LEDGER_COMPLETION_ONLY` | 1 | CURRENT | `evidence:edc686f0f2c23819` |
| `LEDGER_IDEMPOTENT` | 1 | CURRENT | `evidence:8c5c6496c64d2af1` |
| `LEDGER_REVERSAL` | 1 | CURRENT | `evidence:9fe92234351c2a21` |
| `notify` | 2 | CURRENT | `evidence:1e22e2cbdd358582`, `evidence:40f874c352c7961b` |
| `onboard` | 2 | CURRENT | `evidence:74976737515de97b`, `evidence:9a695896728bd4ee` |
| `originate` | 1 | CURRENT | `evidence:6665e1060322c21b` |
| `reconcile` | 2 | CURRENT | `evidence:79ad52fffea34b1a`, `evidence:e64e9d633c6e78e1` |
| `repay` | 2 | CURRENT | `evidence:71fa50e906968c4a`, `evidence:edc686f0f2c23819` |
| `ROLE_LANDING` | 2 | CURRENT | `evidence:3908f3774ce43347`, `evidence:ad58120ad8660fc7` |
| `settle` | 2 | CURRENT | `evidence:23aa4497f86c9d93`, `evidence:e64e9d633c6e78e1` |
| `TENANT_ISOLATION` | 3 | CURRENT | `evidence:0e19ace38d27b844`, `evidence:5114888ef6c519af`, `evidence:97331060658cf43c` |

## Table connectivity

| Table | Readers | Writers | Status / exception |
| --- | ---: | ---: | --- |
| `table:profiles` | 2 | 4 | connected |
| `table:userRoles` | 3 | 7 | connected |
| `table:kycDocuments` | 2 | 3 | connected |
| `table:documentAccessGrants` | 0 | 4 | GAP-4D9749FB3614 |
| `table:loans` | 39 | 9 | connected |
| `table:loanDocuments` | 2 | 2 | connected |
| `table:agreementTemplates` | 2 | 3 | connected |
| `table:agreementSettings` | 0 | 1 | GAP-14040B895A59 |
| `table:loanAgreements` | 12 | 11 | connected |
| `table:loanApprovals` | 1 | 3 | connected |
| `table:disbursements` | 10 | 7 | connected |
| `table:paymentTransactions` | 9 | 6 | connected |
| `table:paymentSchedules` | 2 | 7 | connected |
| `table:rescheduleRequests` | 2 | 2 | connected |
| `table:communications` | 2 | 2 | connected |
| `table:supportTickets` | 3 | 4 | connected |
| `table:paymentAllocations` | 0 | 4 | GAP-7D0721F9D61D |
| `table:approvalRequests` | 5 | 5 | connected |
| `table:approvalHistory` | 0 | 4 | GAP-24582697D5BF |
| `table:workflowDefinitions` | 2 | 2 | connected |
| `table:workflowInstances` | 0 | 0 | GAP-AA1015CAC102 |
| `table:notifications` | 1 | 7 | connected |
| `table:notificationTemplates` | 1 | 0 | GAP-63620DA82BF7 |
| `table:notificationQueue` | 1 | 2 | connected |
| `table:notificationPreferences` | 0 | 1 | GAP-512E383B3BA8 |
| `table:communicationLogs` | 0 | 0 | GAP-4DE4D174E8E0 |
| `table:ipsTransactions` | 8 | 6 | connected |
| `table:vpaRegistry` | 0 | 1 | GAP-5513CC12071A |
| `table:ipsApiLogs` | 0 | 1 | GAP-2E899E24A27D |
| `table:ipsAlerts` | 0 | 6 | GAP-E8EA4EBF9E5B |
| `table:ippRiskEvents` | 1 | 3 | connected |
| `table:ippHandleListings` | 1 | 4 | connected |
| `table:ipsOnboardingApplications` | 16 | 17 | connected |
| `table:ipsDeviceBindings` | 0 | 1 | GAP-73D98AC3584D |
| `table:ipsAliasDirectory` | 4 | 7 | connected |
| `table:settlementParticipants` | 2 | 2 | connected |
| `table:settlementWindows` | 1 | 0 | GAP-509E5E4A37C1 |
| `table:settlementHolidays` | 1 | 0 | GAP-1964130F3CFA |
| `table:settlementFeeRules` | 1 | 0 | GAP-E78676534A3D |
| `table:settlementRuns` | 6 | 5 | connected |
| `table:settlementObligations` | 1 | 1 | connected |
| `table:settlementExposures` | 0 | 1 | GAP-1B00EC98F59D |
| `table:settlementNetInstructions` | 1 | 1 | connected |
| `table:settlementPacs009Batches` | 2 | 1 | connected |
| `table:settlementReports` | 1 | 2 | connected |
| `table:settlementAdjustments` | 4 | 4 | connected |
| `table:settlementTimeoutTransactions` | 3 | 2 | connected |
| `table:settlementAcknowledgements` | 2 | 3 | connected |
| `table:ippDisputeCases` | 1 | 2 | connected |
| `table:ippTransactionReceipts` | 1 | 1 | connected |
| `table:tigerBeetleOutbox` | 2 | 14 | connected |
| `table:tigerBeetleAccounts` | 0 | 1 | GAP-1592DE439864 |
| `table:tigerBeetleTransfers` | 0 | 1 | GAP-D249B07F105A |
| `table:tigerBeetleReconciliation` | 0 | 1 | GAP-0153FC69A0F7 |
| `table:loanProcessingFailures` | 0 | 2 | GAP-11FA22723A0F |
| `table:auditLogs` | 0 | 158 | GAP-E9ADA1E95283 |
| `table:viewLogs` | 1 | 1 | connected |
| `table:stateTransitions` | 1 | 1 | connected |
| `table:complianceReports` | 0 | 1 | GAP-0EEB6CAF8B87 |
| `table:ippComplianceEvidence` | 0 | 7 | GAP-F565DE673FC4 |
| `table:reconciliationRuns` | 1 | 1 | connected |
| `table:bankTransactions` | 3 | 4 | connected |
| `table:collectionsInteractions` | 1 | 1 | connected |
| `table:overdueReminders` | 1 | 1 | connected |
| `table:promiseToPay` | 4 | 2 | connected |
| `table:sequenceCounters` | 0 | 7 | GAP-BA904942234A |
| `table:systemConfiguration` | 2 | 3 | connected |
| `table:eventJournal` | 1 | 165 | connected |
| `table:snapshots` | 0 | 1 | GAP-039C753A8E3B |
| `table:relationships` | 1 | 27 | connected |
| `table:mandates` | 11 | 8 | connected |
| `table:mandateExecutions` | 2 | 3 | connected |
| `table:consentRecords` | 1 | 3 | connected |
| `table:institutions` | 41 | 6 | connected |
| `table:institutionDocuments` | 1 | 1 | connected |
| `table:institutionConfig` | 0 | 4 | GAP-D1CF003240B8 |
| `table:platformAdmins` | 3 | 3 | connected |
| `table:plans` | 4 | 2 | connected |
| `table:tenantSubscriptions` | 0 | 3 | GAP-E4BAF2AD052C |
| `table:tenantEntitlements` | 3 | 1 | connected |
| `table:featuresCatalog` | 2 | 2 | connected |
| `table:platformGuardrails` | 0 | 1 | GAP-F87A7F4D9DAF |
| `table:supportAccessAudit` | 3 | 3 | connected |
| `table:paymentRails` | 4 | 4 | connected |
| `table:productDefinitions` | 6 | 4 | connected |
| `table:productVersions` | 2 | 2 | connected |
| `table:accounts` | 5 | 5 | connected |
| `table:portfolioMetrics` | 0 | 11 | GAP-7320B29C86FA |
| `table:businessRules` | 1 | 5 | connected |
| `table:budgetEntries` | 0 | 2 | GAP-ED6C6DBA601B |
| `table:savingsGoals` | 1 | 2 | connected |
| `table:budgetLimits` | 0 | 1 | GAP-FA5356EE9894 |
| `table:users` | 3 | 2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authSessions` | 0 | 0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authAccounts` | 0 | 2 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRefreshTokens` | 0 | 0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerificationCodes` | 0 | 0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authVerifiers` | 0 | 0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
| `table:authRateLimits` | 0 | 0 | Reads and writes are mediated by the @convex-dev/auth dependency. |
