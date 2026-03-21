/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_ipsAdapter from '../actions/ipsAdapter.js';
import type * as actions_processLoanApplication from '../actions/processLoanApplication.js';
import type * as actions_sendNotification from '../actions/sendNotification.js';
import type * as actions_sendSms from '../actions/sendSms.js';
import type * as actions_sendWhatsapp from '../actions/sendWhatsapp.js';
import type * as analytics from '../analytics.js';
import type * as approvalWorkflow from '../approvalWorkflow.js';
import type * as audit from '../audit.js';
import type * as auth from '../auth.js';
import type * as collections from '../collections.js';
import type * as crons from '../crons.js';
import type * as disbursements from '../disbursements.js';
import type * as http from '../http.js';
import type * as ips_ipsAlerts from '../ips/ipsAlerts.js';
import type * as ips_ipsApiLogs from '../ips/ipsApiLogs.js';
import type * as ips_ipsOnboarding from '../ips/ipsOnboarding.js';
import type * as ips_ipsTransactions from '../ips/ipsTransactions.js';
import type * as ips_ipsVpa from '../ips/ipsVpa.js';
import type * as lib_audit from '../lib/audit.js';
import type * as lib_auth from '../lib/auth.js';
import type * as lib_pagination from '../lib/pagination.js';
import type * as lib_regulatory from '../lib/regulatory.js';
import type * as lib_xmlEscape from '../lib/xmlEscape.js';
import type * as loanApprovals from '../loanApprovals.js';
import type * as loanDocuments from '../loanDocuments.js';
import type * as loans from '../loans.js';
import type * as notifications from '../notifications.js';
import type * as payments from '../payments.js';
import type * as reconciliation from '../reconciliation.js';
import type * as scheduled_dailyTasks from '../scheduled/dailyTasks.js';
import type * as scheduled_tigerBeetleOutboxWorker from '../scheduled/tigerBeetleOutboxWorker.js';
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
import type * as systemConfig from '../systemConfig.js';
import type * as tigerbeetle_accounts from '../tigerbeetle/accounts.js';
import type * as tigerbeetle_outbox from '../tigerbeetle/outbox.js';
import type * as tigerbeetle_reconciliation from '../tigerbeetle/reconciliation.js';
import type * as tigerbeetle_transfers from '../tigerbeetle/transfers.js';
import type * as users from '../users.js';

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server';

declare const fullApi: ApiFromModules<{
  'actions/ipsAdapter': typeof actions_ipsAdapter;
  'actions/processLoanApplication': typeof actions_processLoanApplication;
  'actions/sendNotification': typeof actions_sendNotification;
  'actions/sendSms': typeof actions_sendSms;
  'actions/sendWhatsapp': typeof actions_sendWhatsapp;
  analytics: typeof analytics;
  approvalWorkflow: typeof approvalWorkflow;
  audit: typeof audit;
  auth: typeof auth;
  collections: typeof collections;
  crons: typeof crons;
  disbursements: typeof disbursements;
  http: typeof http;
  'ips/ipsAlerts': typeof ips_ipsAlerts;
  'ips/ipsApiLogs': typeof ips_ipsApiLogs;
  'ips/ipsOnboarding': typeof ips_ipsOnboarding;
  'ips/ipsTransactions': typeof ips_ipsTransactions;
  'ips/ipsVpa': typeof ips_ipsVpa;
  'lib/audit': typeof lib_audit;
  'lib/auth': typeof lib_auth;
  'lib/pagination': typeof lib_pagination;
  'lib/regulatory': typeof lib_regulatory;
  'lib/xmlEscape': typeof lib_xmlEscape;
  loanApprovals: typeof loanApprovals;
  loanDocuments: typeof loanDocuments;
  loans: typeof loans;
  notifications: typeof notifications;
  payments: typeof payments;
  reconciliation: typeof reconciliation;
  'scheduled/dailyTasks': typeof scheduled_dailyTasks;
  'scheduled/tigerBeetleOutboxWorker': typeof scheduled_tigerBeetleOutboxWorker;
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
  systemConfig: typeof systemConfig;
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
