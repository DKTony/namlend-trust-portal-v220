/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_ipsAdapter from '../actions/ipsAdapter.js';
import type * as actions_ipsAliasAdapter from '../actions/ipsAliasAdapter.js';
import type * as actions_ipsOnboardingAdapter from '../actions/ipsOnboardingAdapter.js';
import type * as actions_processLoanApplication from '../actions/processLoanApplication.js';
import type * as actions_sendNotification from '../actions/sendNotification.js';
import type * as actions_sendSms from '../actions/sendSms.js';
import type * as actions_sendWhatsapp from '../actions/sendWhatsapp.js';
import type * as analytics from '../analytics.js';
import type * as approvalWorkflow from '../approvalWorkflow.js';
import type * as audit from '../audit.js';
import type * as auth from '../auth.js';
import type * as authProviders from '../authProviders.js';
import type * as budget from '../budget.js';
import type * as collections from '../collections.js';
import type * as communications from '../communications.js';
import type * as crons from '../crons.js';
import type * as disbursements from '../disbursements.js';
import type * as documentAccess from '../documentAccess.js';
import type * as http from '../http.js';
import type * as institutionDocuments from '../institutionDocuments.js';
import type * as ippOperations from '../ippOperations.js';
import type * as ips_ipsAlerts from '../ips/ipsAlerts.js';
import type * as ips_ipsAliasDirectory from '../ips/ipsAliasDirectory.js';
import type * as ips_ipsApiLogs from '../ips/ipsApiLogs.js';
import type * as ips_ipsOnboarding from '../ips/ipsOnboarding.js';
import type * as ips_ipsTransactions from '../ips/ipsTransactions.js';
import type * as ips_ipsVpa from '../ips/ipsVpa.js';
import type * as kycDocuments from '../kycDocuments.js';
import type * as lib_amortization from '../lib/amortization.js';
import type * as lib_approvalReadiness from '../lib/approvalReadiness.js';
import type * as lib_audit from '../lib/audit.js';
import type * as lib_auth from '../lib/auth.js';
import type * as lib_authRedirect from '../lib/authRedirect.js';
import type * as lib_creditPolicy from '../lib/creditPolicy.js';
import type * as lib_disbursementCompletion from '../lib/disbursementCompletion.js';
import type * as lib_documentGrants from '../lib/documentGrants.js';
import type * as lib_documentPolicy from '../lib/documentPolicy.js';
import type * as lib_domainEvents from '../lib/domainEvents.js';
import type * as lib_enrollment from '../lib/enrollment.js';
import type * as lib_entitlements from '../lib/entitlements.js';
import type * as lib_eventEmitter from '../lib/eventEmitter.js';
import type * as lib_features from '../lib/features.js';
import type * as lib_institutionScope from '../lib/institutionScope.js';
import type * as lib_ippOperationsRules from '../lib/ippOperationsRules.js';
import type * as lib_ipsAliasRules from '../lib/ipsAliasRules.js';
import type * as lib_ipsCallbackCorrelation from '../lib/ipsCallbackCorrelation.js';
import type * as lib_ipsErrorCodes from '../lib/ipsErrorCodes.js';
import type * as lib_ipsPhoneNormalize from '../lib/ipsPhoneNormalize.js';
import type * as lib_ipsProductionConfig from '../lib/ipsProductionConfig.js';
import type * as lib_ipsResponseParsers from '../lib/ipsResponseParsers.js';
import type * as lib_ipsSigningProvider from '../lib/ipsSigningProvider.js';
import type * as lib_ipsSoftwareSigner from '../lib/ipsSoftwareSigner.js';
import type * as lib_ipsTransactionLimits from '../lib/ipsTransactionLimits.js';
import type * as lib_ipsXmlBuilder from '../lib/ipsXmlBuilder.js';
import type * as lib_kyc from '../lib/kyc.js';
import type * as lib_kycReadiness from '../lib/kycReadiness.js';
import type * as lib_mandateStateMachine from '../lib/mandateStateMachine.js';
import type * as lib_outbox from '../lib/outbox.js';
import type * as lib_pagination from '../lib/pagination.js';
import type * as lib_paymentAllocation from '../lib/paymentAllocation.js';
import type * as lib_platformAuth from '../lib/platformAuth.js';
import type * as lib_projectionEmitter from '../lib/projectionEmitter.js';
import type * as lib_railSelector from '../lib/railSelector.js';
import type * as lib_regulatory from '../lib/regulatory.js';
import type * as lib_relationshipEmitter from '../lib/relationshipEmitter.js';
import type * as lib_repaymentApplication from '../lib/repaymentApplication.js';
import type * as lib_repaymentOutbox from '../lib/repaymentOutbox.js';
import type * as lib_ruleEvaluator from '../lib/ruleEvaluator.js';
import type * as lib_scheduleGeneration from '../lib/scheduleGeneration.js';
import type * as lib_supportAudit from '../lib/supportAudit.js';
import type * as lib_temporal from '../lib/temporal.js';
import type * as lib_tenancy from '../lib/tenancy.js';
import type * as lib_xmlEscape from '../lib/xmlEscape.js';
import type * as loanApprovals from '../loanApprovals.js';
import type * as loanDocuments from '../loanDocuments.js';
import type * as loanProcessing from '../loanProcessing.js';
import type * as loans from '../loans.js';
import type * as notifications from '../notifications.js';
import type * as ontology_accounts from '../ontology/accounts.js';
import type * as ontology_businessRules from '../ontology/businessRules.js';
import type * as ontology_consentRecords from '../ontology/consentRecords.js';
import type * as ontology_eventJournal from '../ontology/eventJournal.js';
import type * as ontology_institutions from '../ontology/institutions.js';
import type * as ontology_mandateExecutions from '../ontology/mandateExecutions.js';
import type * as ontology_mandates from '../ontology/mandates.js';
import type * as ontology_paymentRails from '../ontology/paymentRails.js';
import type * as ontology_products from '../ontology/products.js';
import type * as ontology_relationships from '../ontology/relationships.js';
import type * as ontology_snapshots from '../ontology/snapshots.js';
import type * as payments from '../payments.js';
import type * as platform_admins from '../platform/admins.js';
import type * as platform_backfill from '../platform/backfill.js';
import type * as platform_entitlements from '../platform/entitlements.js';
import type * as platform_lendingWorkflowRepair from '../platform/lendingWorkflowRepair.js';
import type * as platform_plans from '../platform/plans.js';
import type * as platform_readiness from '../platform/readiness.js';
import type * as platform_seed from '../platform/seed.js';
import type * as platform_support from '../platform/support.js';
import type * as platform_tenants from '../platform/tenants.js';
import type * as projections_portfolioProjection from '../projections/portfolioProjection.js';
import type * as reconciliation from '../reconciliation.js';
import type * as scheduled_dailyTasks from '../scheduled/dailyTasks.js';
import type * as scheduled_mandateExecutor from '../scheduled/mandateExecutor.js';
import type * as scheduled_railHealthMonitor from '../scheduled/railHealthMonitor.js';
import type * as scheduled_snapshotGenerator from '../scheduled/snapshotGenerator.js';
import type * as scheduled_tigerBeetleOutboxWorker from '../scheduled/tigerBeetleOutboxWorker.js';
import type * as seed from '../seed.js';
import type * as seedMutations from '../seedMutations.js';
import type * as settlement_settlementAcknowledgements from '../settlement/settlementAcknowledgements.js';
import type * as settlement_settlementActions from '../settlement/settlementActions.js';
import type * as settlement_settlementAdjustments from '../settlement/settlementAdjustments.js';
import type * as settlement_settlementBatches from '../settlement/settlementBatches.js';
import type * as settlement_settlementNetting from '../settlement/settlementNetting.js';
import type * as settlement_settlementObligations from '../settlement/settlementObligations.js';
import type * as settlement_settlementParticipants from '../settlement/settlementParticipants.js';
import type * as settlement_settlementReports from '../settlement/settlementReports.js';
import type * as settlement_settlementRuns from '../settlement/settlementRuns.js';
import type * as settlement_settlementTimeouts from '../settlement/settlementTimeouts.js';
import type * as supportTickets from '../supportTickets.js';
import type * as systemConfig from '../systemConfig.js';
import type * as tenantConfig from '../tenantConfig.js';
import type * as tigerbeetle_accounts from '../tigerbeetle/accounts.js';
import type * as tigerbeetle_outbox from '../tigerbeetle/outbox.js';
import type * as tigerbeetle_reconciliation from '../tigerbeetle/reconciliation.js';
import type * as tigerbeetle_transfers from '../tigerbeetle/transfers.js';
import type * as users from '../users.js';

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server';

declare const fullApi: ApiFromModules<{
  'actions/ipsAdapter': typeof actions_ipsAdapter;
  'actions/ipsAliasAdapter': typeof actions_ipsAliasAdapter;
  'actions/ipsOnboardingAdapter': typeof actions_ipsOnboardingAdapter;
  'actions/processLoanApplication': typeof actions_processLoanApplication;
  'actions/sendNotification': typeof actions_sendNotification;
  'actions/sendSms': typeof actions_sendSms;
  'actions/sendWhatsapp': typeof actions_sendWhatsapp;
  analytics: typeof analytics;
  approvalWorkflow: typeof approvalWorkflow;
  audit: typeof audit;
  auth: typeof auth;
  authProviders: typeof authProviders;
  budget: typeof budget;
  collections: typeof collections;
  communications: typeof communications;
  crons: typeof crons;
  disbursements: typeof disbursements;
  documentAccess: typeof documentAccess;
  http: typeof http;
  institutionDocuments: typeof institutionDocuments;
  ippOperations: typeof ippOperations;
  'ips/ipsAlerts': typeof ips_ipsAlerts;
  'ips/ipsAliasDirectory': typeof ips_ipsAliasDirectory;
  'ips/ipsApiLogs': typeof ips_ipsApiLogs;
  'ips/ipsOnboarding': typeof ips_ipsOnboarding;
  'ips/ipsTransactions': typeof ips_ipsTransactions;
  'ips/ipsVpa': typeof ips_ipsVpa;
  kycDocuments: typeof kycDocuments;
  'lib/amortization': typeof lib_amortization;
  'lib/approvalReadiness': typeof lib_approvalReadiness;
  'lib/audit': typeof lib_audit;
  'lib/auth': typeof lib_auth;
  'lib/authRedirect': typeof lib_authRedirect;
  'lib/creditPolicy': typeof lib_creditPolicy;
  'lib/disbursementCompletion': typeof lib_disbursementCompletion;
  'lib/documentGrants': typeof lib_documentGrants;
  'lib/documentPolicy': typeof lib_documentPolicy;
  'lib/domainEvents': typeof lib_domainEvents;
  'lib/enrollment': typeof lib_enrollment;
  'lib/entitlements': typeof lib_entitlements;
  'lib/eventEmitter': typeof lib_eventEmitter;
  'lib/features': typeof lib_features;
  'lib/institutionScope': typeof lib_institutionScope;
  'lib/ippOperationsRules': typeof lib_ippOperationsRules;
  'lib/ipsAliasRules': typeof lib_ipsAliasRules;
  'lib/ipsCallbackCorrelation': typeof lib_ipsCallbackCorrelation;
  'lib/ipsErrorCodes': typeof lib_ipsErrorCodes;
  'lib/ipsPhoneNormalize': typeof lib_ipsPhoneNormalize;
  'lib/ipsProductionConfig': typeof lib_ipsProductionConfig;
  'lib/ipsResponseParsers': typeof lib_ipsResponseParsers;
  'lib/ipsSigningProvider': typeof lib_ipsSigningProvider;
  'lib/ipsSoftwareSigner': typeof lib_ipsSoftwareSigner;
  'lib/ipsTransactionLimits': typeof lib_ipsTransactionLimits;
  'lib/ipsXmlBuilder': typeof lib_ipsXmlBuilder;
  'lib/kyc': typeof lib_kyc;
  'lib/kycReadiness': typeof lib_kycReadiness;
  'lib/mandateStateMachine': typeof lib_mandateStateMachine;
  'lib/outbox': typeof lib_outbox;
  'lib/pagination': typeof lib_pagination;
  'lib/paymentAllocation': typeof lib_paymentAllocation;
  'lib/platformAuth': typeof lib_platformAuth;
  'lib/projectionEmitter': typeof lib_projectionEmitter;
  'lib/railSelector': typeof lib_railSelector;
  'lib/regulatory': typeof lib_regulatory;
  'lib/relationshipEmitter': typeof lib_relationshipEmitter;
  'lib/repaymentApplication': typeof lib_repaymentApplication;
  'lib/repaymentOutbox': typeof lib_repaymentOutbox;
  'lib/ruleEvaluator': typeof lib_ruleEvaluator;
  'lib/scheduleGeneration': typeof lib_scheduleGeneration;
  'lib/supportAudit': typeof lib_supportAudit;
  'lib/temporal': typeof lib_temporal;
  'lib/tenancy': typeof lib_tenancy;
  'lib/xmlEscape': typeof lib_xmlEscape;
  loanApprovals: typeof loanApprovals;
  loanDocuments: typeof loanDocuments;
  loanProcessing: typeof loanProcessing;
  loans: typeof loans;
  notifications: typeof notifications;
  'ontology/accounts': typeof ontology_accounts;
  'ontology/businessRules': typeof ontology_businessRules;
  'ontology/consentRecords': typeof ontology_consentRecords;
  'ontology/eventJournal': typeof ontology_eventJournal;
  'ontology/institutions': typeof ontology_institutions;
  'ontology/mandateExecutions': typeof ontology_mandateExecutions;
  'ontology/mandates': typeof ontology_mandates;
  'ontology/paymentRails': typeof ontology_paymentRails;
  'ontology/products': typeof ontology_products;
  'ontology/relationships': typeof ontology_relationships;
  'ontology/snapshots': typeof ontology_snapshots;
  payments: typeof payments;
  'platform/admins': typeof platform_admins;
  'platform/backfill': typeof platform_backfill;
  'platform/entitlements': typeof platform_entitlements;
  'platform/lendingWorkflowRepair': typeof platform_lendingWorkflowRepair;
  'platform/plans': typeof platform_plans;
  'platform/readiness': typeof platform_readiness;
  'platform/seed': typeof platform_seed;
  'platform/support': typeof platform_support;
  'platform/tenants': typeof platform_tenants;
  'projections/portfolioProjection': typeof projections_portfolioProjection;
  reconciliation: typeof reconciliation;
  'scheduled/dailyTasks': typeof scheduled_dailyTasks;
  'scheduled/mandateExecutor': typeof scheduled_mandateExecutor;
  'scheduled/railHealthMonitor': typeof scheduled_railHealthMonitor;
  'scheduled/snapshotGenerator': typeof scheduled_snapshotGenerator;
  'scheduled/tigerBeetleOutboxWorker': typeof scheduled_tigerBeetleOutboxWorker;
  seed: typeof seed;
  seedMutations: typeof seedMutations;
  'settlement/settlementAcknowledgements': typeof settlement_settlementAcknowledgements;
  'settlement/settlementActions': typeof settlement_settlementActions;
  'settlement/settlementAdjustments': typeof settlement_settlementAdjustments;
  'settlement/settlementBatches': typeof settlement_settlementBatches;
  'settlement/settlementNetting': typeof settlement_settlementNetting;
  'settlement/settlementObligations': typeof settlement_settlementObligations;
  'settlement/settlementParticipants': typeof settlement_settlementParticipants;
  'settlement/settlementReports': typeof settlement_settlementReports;
  'settlement/settlementRuns': typeof settlement_settlementRuns;
  'settlement/settlementTimeouts': typeof settlement_settlementTimeouts;
  supportTickets: typeof supportTickets;
  systemConfig: typeof systemConfig;
  tenantConfig: typeof tenantConfig;
  'tigerbeetle/accounts': typeof tigerbeetle_accounts;
  'tigerbeetle/outbox': typeof tigerbeetle_outbox;
  'tigerbeetle/reconciliation': typeof tigerbeetle_reconciliation;
  'tigerbeetle/transfers': typeof tigerbeetle_transfers;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>>;

export declare const components: {};
