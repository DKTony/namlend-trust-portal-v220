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
  buildStandardHead,
  insertSignature,
  parseIpsAck,
  type IpsReqPayPayload,
} from '../lib/ipsXmlBuilder';
import { createSigningProvider } from '../lib/ipsSigningProvider';
import { getErrorEntry, mapToTransactionStatus, isRetryable } from '../lib/ipsErrorCodes';

const IPS_BASE_URL = process.env.IPS_BASE_URL ?? 'https://ips.bon.na/api/v2';

// Legacy JSON config (kept for json_mock mode)
const IPS_CLIENT_ID = process.env.IPS_CLIENT_ID;
const IPS_CLIENT_SECRET = process.env.IPS_CLIENT_SECRET;

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
  ack: ReturnType<typeof parseIpsAck> extends Promise<infer T> ? T : never;
  durationMs: number;
}> {
  const signer = createSigningProvider();

  // Sign the XML body
  const signature = await signer.sign(xml);
  const signedXml = insertSignature(xml, signature);

  const startTime = Date.now();

  const response = await fetch(`${IPS_BASE_URL}/xml`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'X-Api-Name': apiName,
      'X-Key-Id': signer.getKeyId(),
    },
    body: signedXml,
  });

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
      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
        transactionId: args.transactionId,
        status: 'failed',
        errorCode: 'XML_PROTOCOL_ERROR',
        errorDescription: msg,
      });
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

    const msgId = `VAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

    const msgId = `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    const msgId = `HBT-${Date.now()}`;
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

    const msgId = `BAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
