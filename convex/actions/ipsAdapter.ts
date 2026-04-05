'use node';
/**
 * IPS Adapter Action — handles outbound IPS API calls and inbound webhook processing.
 *
 * Protocol: Asynchronous XML over HTTPS with RSA-SHA256 digital signatures.
 * Flow: Send ReqXxx → receive immediate ACK → later receive RespXxx via webhook.
 *
 * Feature flag IPS_PROTOCOL_MODE (from businessRules table):
 *   "json_mock"      — legacy JSON/REST behavior (development)
 *   "xml_sandbox"    — XML protocol against IPS sandbox
 *   "xml_production" — XML protocol against production IPS
 */

import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import {
  buildReqPay,
  buildReqValAdd,
  buildReqChkTxn,
  buildReqHbt,
  buildReqBalEnq,
  buildReqRev,
  buildReqAuthDetail,
  buildTxnConfirmation,
  buildStandardHead,
  insertSignature,
  parseIpsAck,
  generateMsgId,
  ipsTimestamp,
  type IpsReqPayPayload,
  type IpsReqRevPayload,
} from '../lib/ipsXmlBuilder';
import { createSigningProvider } from '../lib/ipsSigningProvider';
import { getErrorEntry, mapToTransactionStatus, isRetryable } from '../lib/ipsErrorCodes';

const IPS_BASE_URL = process.env.IPS_BASE_URL ?? 'https://ips.bon.na/api/v2';

// Legacy JSON config (kept for json_mock mode)
const IPS_CLIENT_ID = process.env.IPS_CLIENT_ID;
const IPS_CLIENT_SECRET = process.env.IPS_CLIENT_SECRET;

// ---------------------------------------------------------------------------
// Timeout configuration — per IPS TSD §2.5
// ---------------------------------------------------------------------------

/** Non-financial API timeout (ReqValAdd, ReqHbt, ReqChkTxn, etc.) */
const TIMEOUT_NON_FINANCIAL_MS = 10_000;
/** Financial API timeout (ReqPay, ReqBalEnq, etc.) */
const TIMEOUT_FINANCIAL_MS = 30_000;

/** APIs classified as financial (subject to 30s timeout) */
const FINANCIAL_APIS = new Set(['ReqPay', 'ReqBalEnq', 'ReqSetCre']);

function getTimeoutForApi(apiName: string): number {
  return FINANCIAL_APIS.has(apiName) ? TIMEOUT_FINANCIAL_MS : TIMEOUT_NON_FINANCIAL_MS;
}

// ---------------------------------------------------------------------------
// mTLS configuration — per IPS TSD §3.1
// Env vars: IPS_CLIENT_CERT (PEM), IPS_CLIENT_KEY (PEM), IPS_CA_CERT (PEM)
// ---------------------------------------------------------------------------

function getMtlsAgent(): any | undefined {
  const clientCert = process.env.IPS_CLIENT_CERT;
  const clientKey = process.env.IPS_CLIENT_KEY;
  const caCert = process.env.IPS_CA_CERT;

  if (!clientCert || !clientKey) return undefined;

  // Lazy require to avoid bundler issues in non-node contexts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const https = require('https');
  return new https.Agent({
    cert: clientCert,
    key: clientKey,
    ca: caCert || undefined,
    rejectUnauthorized: true,
  });
}

// ---------------------------------------------------------------------------
// Protocol mode detection
// ---------------------------------------------------------------------------

type ProtocolMode = 'json_mock' | 'xml_sandbox' | 'xml_production';

async function getProtocolMode(ctx: any): Promise<ProtocolMode> {
  try {
    const rule = await ctx.runQuery(internal.lib.ruleEvaluator.getStringRuleQuery, {
      ruleCode: 'IPS_PROTOCOL_MODE',
      fallback: 'json_mock',
    });
    if (rule === 'xml_sandbox' || rule === 'xml_production') return rule;
  } catch {
    // Rule query may not exist yet — fall back safely
  }
  return 'json_mock';
}

// ---------------------------------------------------------------------------
// XML Protocol — Outbound Request Helper
// ---------------------------------------------------------------------------

async function sendIpsXml(
  ctx: any,
  apiName: string,
  xml: string,
  transactionId?: string,
  correlationId?: string
): Promise<{
  ack: import('../lib/ipsXmlBuilder').IpsAckParsed;
  durationMs: number;
}> {
  const signer = createSigningProvider();

  // Sign the XML body
  const signature = await signer.sign(xml);
  const signedXml = insertSignature(xml, signature);

  const startTime = Date.now();
  const timeoutMs = getTimeoutForApi(apiName);

  // AbortController for spec-mandated timeouts (IPS TSD §2.5)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  const mtlsAgent = getMtlsAgent();
  const fetchOptions: any = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'X-Api-Name': apiName,
      'X-Key-Id': signer.getKeyId(),
    },
    body: signedXml,
    signal: controller.signal,
  };
  // Attach mTLS agent if configured (Node.js undici dispatcher)
  if (mtlsAgent) {
    fetchOptions.dispatcher = mtlsAgent;
  }

  try {
    response = await fetch(`${IPS_BASE_URL}/xml`, fetchOptions);
  } catch (error) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    // Log the timeout/network failure
    await ctx.runMutation(internal.ips.ipsApiLogs.logApiCall, {
      transactionId: transactionId ? (transactionId as any) : undefined,
      method: 'POST',
      endpoint: `/xml/${apiName}`,
      requestBody: { apiName, xmlLength: signedXml.length },
      durationMs,
      direction: 'OUTBOUND' as const,
      contentType: 'xml' as const,
      apiName,
      rawXml: signedXml,
      correlationId,
      errorMessage: error instanceof Error ? error.message : 'Request failed',
    });

    // Distinguish timeout from other network errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`IPS_TIMEOUT: ${apiName} did not respond within ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const ackXml = await response.text();
  const durationMs = Date.now() - startTime;

  // Log the outbound call
  await ctx.runMutation(internal.ips.ipsApiLogs.logApiCall, {
    transactionId: transactionId ? (transactionId as any) : undefined,
    method: 'POST',
    endpoint: `/xml/${apiName}`,
    requestBody: { apiName, xmlLength: signedXml.length },
    responseStatus: response.status,
    responseBody: { ackXml: ackXml.substring(0, 500) },
    durationMs,
    direction: 'OUTBOUND' as const,
    contentType: 'xml' as const,
    apiName,
    rawXml: signedXml,
    correlationId,
  });

  const ack = parseIpsAck(ackXml);

  // Log NACK errors for diagnostics (IPS TSD §2.4)
  if (ack.result === 'FAILURE' && ack.nackErrors?.length) {
    console.warn(`[ips] NACK from ${apiName}: ${JSON.stringify(ack.nackErrors)}`);
  }

  return { ack, durationMs };
}

// ---------------------------------------------------------------------------
// Legacy JSON helpers (json_mock mode)
// ---------------------------------------------------------------------------

let _accessToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) {
    return _accessToken;
  }

  const response = await fetch(`${IPS_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: IPS_CLIENT_ID ?? '',
      client_secret: IPS_CLIENT_SECRET ?? '',
    }),
  });

  const data = await response.json();
  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _accessToken!;
}

async function sendJsonMock(
  ctx: any,
  args: {
    transactionId: string;
    msgId: string;
    amount: number;
    creditorVpa: string;
    debtorVpa: string;
    remittanceInfo?: string;
  }
): Promise<{ success: boolean; data?: any; error?: any }> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${IPS_BASE_URL}/credit-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({
        msgId: args.msgId,
        amount: args.amount,
        currency: 'NAD',
        creditorVpa: args.creditorVpa,
        debtorVpa: args.debtorVpa,
        remittanceInfo: args.remittanceInfo,
      }),
    });

    const responseBody = await response.json();
    const durationMs = Date.now() - startTime;

    await ctx.runMutation(internal.ips.ipsApiLogs.logApiCall, {
      transactionId: args.transactionId as any,
      method: 'POST',
      endpoint: '/credit-transfer',
      requestBody: { msgId: args.msgId, amount: args.amount },
      responseStatus: response.status,
      responseBody,
      durationMs,
      direction: 'OUTBOUND' as const,
      contentType: 'json' as const,
    });

    if (!response.ok) {
      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
        transactionId: args.transactionId as any,
        status: 'failed',
        rawResponse: responseBody,
        errorCode: String(response.status),
        errorDescription: responseBody?.message ?? 'IPS API error',
      });
      return { success: false, error: responseBody };
    }

    await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
      transactionId: args.transactionId as any,
      status: 'processing',
      rawResponse: responseBody,
    });

    return { success: true, data: responseBody };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Network error';
    await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
      transactionId: args.transactionId as any,
      status: 'failed',
      errorCode: 'NETWORK_ERROR',
      errorDescription: msg,
    });
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Initiate Outbound Transfer (ReqPay)
// ---------------------------------------------------------------------------

export const initiateOutboundTransfer = internalAction({
  args: {
    transactionId: v.id('ipsTransactions'),
    msgId: v.string(),
    amount: v.number(),
    creditorVpa: v.string(),
    debtorVpa: v.string(),
    remittanceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    // Legacy JSON mode
    if (mode === 'json_mock') {
      return sendJsonMock(ctx, {
        transactionId: args.transactionId,
        msgId: args.msgId,
        amount: args.amount,
        creditorVpa: args.creditorVpa,
        debtorVpa: args.debtorVpa,
        remittanceInfo: args.remittanceInfo,
      });
    }

    // XML protocol mode
    try {
      const head = buildStandardHead(args.msgId);
      const payload: IpsReqPayPayload = {
        type: 'PAY',
        subType: 'DEBIT',
        payer: { addr: args.debtorVpa },
        payee: { addr: args.creditorVpa },
        amount: args.amount,
        currency: 'NAD',
        note: args.remittanceInfo,
      };

      const xml = buildReqPay(head, payload);
      const { ack } = await sendIpsXml(ctx, 'ReqPay', xml, args.transactionId, args.msgId);

      if (ack.result === 'SUCCESS') {
        // ACK received — transaction is now processing (awaiting async RespPay)
        await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
          transactionId: args.transactionId,
          status: 'processing',
          rawResponse: { ackResult: ack.result, ackApi: ack.api },
        });
        return { success: true, data: { ackResult: ack.result } };
      } else {
        // ACK failed — IPS rejected the message before processing
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
          transactionId: args.transactionId,
          status: 'failed',
          rawResponse: { ackResult: ack.result, errorCode: ack.errorCode },
          errorCode: ack.errorCode ?? 'ACK_FAILURE',
          errorDescription: ack.errorDescription ?? errorEntry.userMessage,
        });
        return { success: false, error: ack.errorDescription ?? 'ACK rejected' };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'XML protocol error';
      const isTimeout = msg.startsWith('IPS_TIMEOUT:');

      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
        transactionId: args.transactionId,
        status: isTimeout ? 'timeout' : 'failed',
        errorCode: isTimeout ? 'IPS_TIMEOUT' : 'XML_PROTOCOL_ERROR',
        errorDescription: msg,
      });

      // For timeouts on financial APIs, schedule deemed resolution with ChkTxn
      if (isTimeout) {
        try {
          await (ctx.scheduler as any).runAfter(
            5000,
            internal.actions.ipsAdapter.resolveDeemedTransaction,
            {
              transactionId: args.transactionId,
              orgTxnId: args.msgId,
              orgMsgId: args.msgId,
              attemptNumber: 1,
            }
          );
        } catch {
          // Scheduler failure is non-fatal — manual ChkTxn still possible
        }
      }

      return { success: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// Validate VPA (ReqValAdd)
// ---------------------------------------------------------------------------

export const validateVpa = internalAction({
  args: {
    addr: v.string(),
    correlationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      // Mock: assume valid
      return { valid: true, name: 'Mock User', provider: 'mock-bank' };
    }

    const msgId = generateMsgId();
    const head = buildStandardHead(msgId);
    const xml = buildReqValAdd(head, { addr: args.addr });

    try {
      const { ack } = await sendIpsXml(ctx, 'ReqValAdd', xml, undefined, args.correlationId);
      return {
        valid: ack.result === 'SUCCESS',
        errorCode: ack.errorCode,
        errorDescription: ack.errorDescription,
      };
    } catch (error) {
      return {
        valid: false,
        errorCode: 'NETWORK_ERROR',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Check Transaction Status (ReqChkTxn)
// ---------------------------------------------------------------------------

export const checkTransactionStatus = internalAction({
  args: {
    orgTxnId: v.string(),
    orgMsgId: v.string(),
    transactionId: v.optional(v.id('ipsTransactions')),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      return { status: 'processing', respCode: 'MOCK' };
    }

    const msgId = generateMsgId();
    const head = buildStandardHead(msgId);
    const xml = buildReqChkTxn(head, {
      orgTxnId: args.orgTxnId,
      orgMsgId: args.orgMsgId,
    });

    try {
      const { ack } = await sendIpsXml(ctx, 'ReqChkTxn', xml, args.transactionId, args.orgMsgId);
      return { status: ack.result, respCode: ack.errorCode };
    } catch (error) {
      return {
        status: 'error',
        respCode: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Heartbeat (ReqHbt) — used by rail health monitor
// ---------------------------------------------------------------------------

export const heartbeat = internalAction({
  args: {},
  handler: async (ctx) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      return { healthy: true, mode: 'json_mock' };
    }

    const orgId = process.env.IPS_ORG_ID ?? 'NAMLEND';
    const msgId = generateMsgId();
    const head = buildStandardHead(msgId);
    const xml = buildReqHbt(head, { orgId });

    try {
      const { ack, durationMs } = await sendIpsXml(ctx, 'ReqHbt', xml);
      return {
        healthy: ack.result === 'SUCCESS',
        durationMs,
        mode,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        mode,
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Balance Enquiry (ReqBalEnq)
// ---------------------------------------------------------------------------

export const balanceEnquiry = internalAction({
  args: {
    addr: v.string(),
    sovPrvd: v.string(),
    account: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      return { balance: null, mode: 'json_mock' };
    }

    const msgId = generateMsgId();
    const head = buildStandardHead(msgId);
    const xml = buildReqBalEnq(head, args);

    try {
      const { ack } = await sendIpsXml(ctx, 'ReqBalEnq', xml);
      return { success: ack.result === 'SUCCESS', errorCode: ack.errorCode };
    } catch (error) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Handle Inbound IPS XML Response (called from http.ts webhook)
// ---------------------------------------------------------------------------

export const handleWebhook = internalAction({
  args: {
    apiName: v.string(),
    msgId: v.string(),
    respCode: v.optional(v.string()),
    respDescription: v.optional(v.string()),
    txnData: v.optional(v.any()),
    rawXml: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.msgId) {
      console.warn('[ips webhook] Missing msgId in callback');
      return;
    }

    // Log the inbound callback
    await ctx.runMutation(internal.ips.ipsApiLogs.logApiCall, {
      method: 'CALLBACK',
      endpoint: `/webhook/ips/${args.apiName}`,
      requestBody: { apiName: args.apiName, msgId: args.msgId, respCode: args.respCode },
      direction: 'CALLBACK' as const,
      contentType: 'xml' as const,
      apiName: args.apiName,
      rawXml: args.rawXml,
      correlationId: args.msgId,
    });

    // Route by API type
    if (args.apiName === 'RespPay') {
      await handleRespPay(ctx, args);
    } else if (args.apiName === 'RespValAdd') {
      // VPA validation responses — mostly fire-and-forget
      console.log(`[ips webhook] RespValAdd for ${args.msgId}: ${args.respCode}`);
    } else if (args.apiName === 'RespChkTxn') {
      await handleRespPay(ctx, args); // Same status update logic
    } else if (args.apiName === 'RespRegMapper') {
      await ctx.runAction(internal.actions.ipsAliasAdapter.handleRespRegMapper, {
        msgId: args.msgId,
        respCode: args.respCode,
        respDescription: args.respDescription,
        rawXml: args.rawXml,
        txnData: args.txnData,
      });
    } else if (args.apiName === 'RespGetAdd') {
      await ctx.runAction(internal.actions.ipsAliasAdapter.handleRespGetAdd, {
        msgId: args.msgId,
        respCode: args.respCode,
        respDescription: args.respDescription,
        rawXml: args.rawXml,
        txnData: args.txnData,
      });
    } else if (args.apiName === 'ReqMapperConfirmation') {
      await ctx.runAction(internal.actions.ipsAliasAdapter.handleMapperConfirmation, {
        msgId: args.msgId,
        respCode: args.respCode,
        respDescription: args.respDescription,
        rawXml: args.rawXml,
        txnData: args.txnData,
      });
    } else if (args.apiName === 'RespRev') {
      // Reversal response — same status update logic as RespPay
      await handleRespPay(ctx, args);
    } else if (args.apiName === 'RespAuthDetail') {
      console.log(`[ips webhook] RespAuthDetail for ${args.msgId}: ${args.respCode}`);
    } else if (args.apiName === 'TxnConfirmation') {
      // Inbound confirmation from payee PSP
      console.log(`[ips webhook] TxnConfirmation for ${args.msgId}: ${args.respCode}`);
      await handleRespPay(ctx, args);
    } else {
      console.log(`[ips webhook] Unhandled API: ${args.apiName} for ${args.msgId}`);
    }
  },
});

async function handleRespPay(
  ctx: any,
  args: {
    msgId: string;
    respCode?: string;
    respDescription?: string;
    txnData?: any;
  }
) {
  // Find the transaction by msgId
  const txn = await ctx.runQuery(internal.ips.ipsTransactions.getTransactionByMsgIdInternal, {
    msgId: args.msgId,
  });

  if (!txn) {
    console.warn(`[ips webhook] Unknown msgId: ${args.msgId}`);
    return;
  }

  const respCode = args.respCode ?? 'UNKNOWN';
  const status = mapToTransactionStatus(respCode);
  const errorEntry = getErrorEntry(respCode);

  await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
    transactionId: txn._id,
    status,
    rawResponse: args.txnData ?? { respCode, respDescription: args.respDescription },
    errorCode: respCode === '00' ? undefined : respCode,
    errorDescription:
      respCode === '00' ? undefined : (args.respDescription ?? errorEntry.userMessage),
    settlementDate: args.txnData?.settlementDate,
  });

  console.log(
    `[ips webhook] ${args.msgId} → ${status} (code: ${respCode}, retryable: ${isRetryable(respCode)})`
  );
}

// ---------------------------------------------------------------------------
// Handle Payment Gateway Webhook (PayToday, MTC MoMo, TN Mobile)
// ---------------------------------------------------------------------------

export const handlePaymentWebhook = internalAction({
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    const gateway = payload.gateway as string;
    console.log(`[payment webhook] Received from ${gateway}:`, payload);
  },
});

// ---------------------------------------------------------------------------
// Reversal (ReqRev) — IPP FSD §4.14
// ---------------------------------------------------------------------------

export const initiateReversal = internalAction({
  args: {
    transactionId: v.id('ipsTransactions'),
    orgTxnId: v.string(),
    orgMsgId: v.string(),
    revType: v.union(v.literal('FULL'), v.literal('PARTIAL')),
    amount: v.optional(v.number()),
    reasonCode: v.string(),
    reasonDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      // Mock: simulate reversal success
      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
        transactionId: args.transactionId,
        status: 'reversed',
        rawResponse: { mock: true, revType: args.revType },
      });
      return { success: true, mode: 'json_mock' };
    }

    try {
      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);
      const payload: IpsReqRevPayload = {
        orgTxnId: args.orgTxnId,
        orgMsgId: args.orgMsgId,
        revType: args.revType,
        amount: args.amount,
        currency: 'NAD',
        reasonCode: args.reasonCode,
        reasonDescription: args.reasonDescription,
      };

      const xml = buildReqRev(head, payload);
      const { ack } = await sendIpsXml(ctx, 'ReqRev', xml, args.transactionId, args.orgMsgId);

      if (ack.result === 'SUCCESS') {
        await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
          transactionId: args.transactionId,
          status: 'reversed',
          rawResponse: { ackResult: ack.result },
        });
        return { success: true };
      } else {
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
          transactionId: args.transactionId,
          status: 'failed',
          errorCode: ack.errorCode ?? 'REV_REJECTED',
          errorDescription: ack.errorDescription ?? errorEntry.userMessage,
        });
        return { success: false, error: ack.errorDescription };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Reversal error';
      return { success: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// Collect / Request-to-Pay (ReqPay type=COLLECT) — IPP FSD §4.3
// ---------------------------------------------------------------------------

export const initiateCollectRequest = internalAction({
  args: {
    transactionId: v.id('ipsTransactions'),
    msgId: v.string(),
    amount: v.number(),
    payerVpa: v.string(),
    payeeVpa: v.string(),
    note: v.optional(v.string()),
    expiryMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
        transactionId: args.transactionId,
        status: 'processing',
        rawResponse: { mock: true, type: 'COLLECT' },
      });
      return { success: true, mode: 'json_mock' };
    }

    try {
      const head = buildStandardHead(args.msgId);
      const payload: IpsReqPayPayload = {
        type: 'COLLECT',
        payer: { addr: args.payerVpa },
        payee: { addr: args.payeeVpa },
        amount: args.amount,
        currency: 'NAD',
        note: args.note ?? 'Loan repayment collection',
      };

      const xml = buildReqPay(head, payload);
      const { ack } = await sendIpsXml(ctx, 'ReqPay', xml, args.transactionId, args.msgId);

      if (ack.result === 'SUCCESS') {
        await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
          transactionId: args.transactionId,
          status: 'processing',
          rawResponse: { ackResult: ack.result, type: 'COLLECT' },
        });
        return { success: true };
      } else {
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
          transactionId: args.transactionId,
          status: 'failed',
          errorCode: ack.errorCode ?? 'COLLECT_REJECTED',
          errorDescription: ack.errorDescription ?? errorEntry.userMessage,
        });
        return { success: false, error: ack.errorDescription };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Collect request error';
      const isTimeout = msg.startsWith('IPS_TIMEOUT:');
      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
        transactionId: args.transactionId,
        status: isTimeout ? 'timeout' : 'failed',
        errorCode: isTimeout ? 'IPS_TIMEOUT' : 'COLLECT_ERROR',
        errorDescription: msg,
      });
      return { success: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// Auth Detail (ReqAuthDetail) — IPP FSD §4.5
// ---------------------------------------------------------------------------

export const queryAuthDetail = internalAction({
  args: {
    txnId: v.string(),
    orgApi: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      return { authStatus: 'AUTHENTICATED', mode: 'json_mock' };
    }

    const msgId = generateMsgId();
    const head = buildStandardHead(msgId);
    const xml = buildReqAuthDetail(head, {
      txnId: args.txnId,
      orgApi: args.orgApi,
    });

    try {
      const { ack } = await sendIpsXml(ctx, 'ReqAuthDetail', xml, undefined, args.txnId);
      return {
        authStatus: ack.result === 'SUCCESS' ? 'AUTHENTICATED' : 'FAILED',
        errorCode: ack.errorCode,
        errorDescription: ack.errorDescription,
      };
    } catch (error) {
      return {
        authStatus: 'ERROR',
        errorCode: 'NETWORK_ERROR',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Transaction Confirmation (TxnConfirmation) — IPP FSD §4.16
// Sent by payee PSP after crediting beneficiary account.
// ---------------------------------------------------------------------------

export const sendTxnConfirmation = internalAction({
  args: {
    transactionId: v.id('ipsTransactions'),
    orgTxnId: v.string(),
    orgMsgId: v.string(),
    status: v.union(v.literal('CREDITED'), v.literal('FAILED'), v.literal('PENDING')),
    beneficiaryName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      console.log(`[ips] Mock TxnConfirmation: ${args.orgTxnId} → ${args.status}`);
      return { success: true, mode: 'json_mock' };
    }

    try {
      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);
      const xml = buildTxnConfirmation(head, {
        orgTxnId: args.orgTxnId,
        orgMsgId: args.orgMsgId,
        status: args.status,
        beneficiaryName: args.beneficiaryName,
        creditTimestamp: ipsTimestamp(),
      });

      const { ack } = await sendIpsXml(
        ctx,
        'TxnConfirmation',
        xml,
        args.transactionId,
        args.orgMsgId
      );
      return { success: ack.result === 'SUCCESS', errorCode: ack.errorCode };
    } catch (error) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Deemed Transaction Resolution — IPS TSD §2.6
// Scheduled after timeout to resolve via ChkTxn.
// ---------------------------------------------------------------------------

export const resolveDeemedTransaction = internalAction({
  args: {
    transactionId: v.id('ipsTransactions'),
    orgTxnId: v.string(),
    orgMsgId: v.string(),
    attemptNumber: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ resolved: boolean; status?: string; nextAttempt?: number }> => {
    const attempt = args.attemptNumber ?? 1;
    const MAX_DEEMED_ATTEMPTS = 5;

    // Check current status — may have been resolved by webhook already
    const txn: any = await ctx.runQuery(
      internal.ips.ipsTransactions.getTransactionByMsgIdInternal,
      {
        msgId: args.orgMsgId,
      }
    );

    if (
      !txn ||
      txn.status === 'completed' ||
      txn.status === 'failed' ||
      txn.status === 'reversed'
    ) {
      console.log(`[ips deemed] ${args.orgMsgId} already resolved: ${txn?.status}`);
      return { resolved: true, status: txn?.status };
    }

    // Query IPS for actual status
    const result: any = await ctx.runAction(internal.actions.ipsAdapter.checkTransactionStatus, {
      orgTxnId: args.orgTxnId,
      orgMsgId: args.orgMsgId,
      transactionId: args.transactionId,
    });

    if (result.status === 'SUCCESS' || result.status === 'FAILURE') {
      const finalStatus: string = result.status === 'SUCCESS' ? 'completed' : 'failed';
      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
        transactionId: args.transactionId,
        status: finalStatus as any,
        rawResponse: { deemedResolution: true, chkTxnResult: result },
        errorCode: finalStatus === 'failed' ? (result.respCode ?? 'DEEMED_FAILURE') : undefined,
      });
      console.log(
        `[ips deemed] ${args.orgMsgId} resolved via ChkTxn → ${finalStatus} (attempt ${attempt})`
      );
      return { resolved: true, status: finalStatus };
    }

    // Still pending — retry with exponential backoff (max 5 attempts)
    if (attempt < MAX_DEEMED_ATTEMPTS) {
      const backoffMs = Math.min(10_000 * Math.pow(2, attempt - 1), 300_000);
      // Schedule next attempt — uses internal reference (Convex resolves at runtime)
      await (ctx.scheduler as any).runAfter(
        backoffMs,
        internal.actions.ipsAdapter.resolveDeemedTransaction,
        {
          transactionId: args.transactionId,
          orgTxnId: args.orgTxnId,
          orgMsgId: args.orgMsgId,
          attemptNumber: attempt + 1,
        }
      );
      console.log(
        `[ips deemed] ${args.orgMsgId} still pending, retry #${attempt + 1} in ${backoffMs}ms`
      );
      return { resolved: false, nextAttempt: attempt + 1 };
    }

    // Exhausted retries — mark as deemed failure per IPS TSD §2.6
    await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
      transactionId: args.transactionId,
      status: 'failed',
      errorCode: 'DEEMED_UNRESOLVED',
      errorDescription: `Transaction deemed unresolved after ${MAX_DEEMED_ATTEMPTS} ChkTxn attempts`,
    });
    console.warn(
      `[ips deemed] ${args.orgMsgId} unresolved after ${MAX_DEEMED_ATTEMPTS} attempts — marked failed`
    );
    return { resolved: false, status: 'failed' };
  },
});
