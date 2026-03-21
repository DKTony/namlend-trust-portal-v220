'use node';
/**
 * IPS Adapter Action — replaces ips-adapter edge function.
 * Handles outbound IPS API calls and inbound webhook processing.
 *
 * Convex Actions have no time limit and can call external HTTP APIs.
 * All DB writes happen via ctx.runMutation() for atomic semantics.
 */

import { internalAction } from '../_generated/server';
import { internal, api } from '../_generated/api';
import { v } from 'convex/values';

const IPS_BASE_URL = process.env.IPS_BASE_URL ?? 'https://ips.bon.na/api/v2';
const IPS_CLIENT_ID = process.env.IPS_CLIENT_ID;
const IPS_CLIENT_SECRET = process.env.IPS_CLIENT_SECRET;

/**
 * Initiate an outbound IPS credit transfer.
 * Called from disbursements or payment flows when method=ips.
 */
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
    // Log the outbound API request
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

      // Log the API call
      await ctx.runMutation(internal.ips.ipsApiLogs.logApiCall, {
        transactionId: args.transactionId,
        method: 'POST',
        endpoint: '/credit-transfer',
        requestBody: { msgId: args.msgId, amount: args.amount },
        responseStatus: response.status,
        responseBody,
        durationMs,
      });

      if (!response.ok) {
        await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatus, {
          transactionId: args.transactionId,
          status: 'failed',
          rawResponse: responseBody,
          errorCode: String(response.status),
          errorDescription: responseBody?.message ?? 'IPS API error',
        });
        return { success: false, error: responseBody };
      }

      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatus, {
        transactionId: args.transactionId,
        status: 'processing',
        rawResponse: responseBody,
      });

      return { success: true, data: responseBody };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      await ctx.runMutation(internal.ips.ipsTransactions.updateIpsTransactionStatus, {
        transactionId: args.transactionId,
        status: 'failed',
        errorCode: 'NETWORK_ERROR',
        errorDescription: msg,
      });
      return { success: false, error: msg };
    }
  },
});

/**
 * Handle inbound IPS webhook callback from Bank of Namibia.
 * Called from convex/http.ts POST /webhook/ips.
 */
export const handleWebhook = internalAction({
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    const msgId = payload.msgId as string;
    if (!msgId) {
      console.warn('[ips webhook] Missing msgId in payload');
      return;
    }

    // Find the transaction by msgId
    const txn = await ctx.runQuery(api.ips.ipsTransactions.getTransactionByMsgId, {
      msgId,
    });

    if (!txn) {
      console.warn(`[ips webhook] Unknown msgId: ${msgId}`);
      return;
    }

    type IpsStatus = 'processing' | 'completed' | 'failed' | 'reversed' | 'timeout';
    const statusMap: Record<string, IpsStatus> = {
      ACCP: 'processing',
      ACSC: 'completed',
      RJCT: 'failed',
      PDNG: 'processing',
    };

    const status: IpsStatus = statusMap[payload.txStatus as string] ?? 'processing';

    await ctx.runMutation(api.ips.ipsTransactions.updateIpsTransactionStatus, {
      transactionId: txn._id,
      status,
      rawResponse: payload,
      errorCode: payload.reasonCode as string | undefined,
      errorDescription: payload.reasonDescription as string | undefined,
      settlementDate: payload.settlementDate as string | undefined,
    });

    console.log(`[ips webhook] Processed ${msgId} → ${status}`);
  },
});

/**
 * Handle payment gateway webhook (PayToday, MTC MoMo, TN Mobile).
 */
export const handlePaymentWebhook = internalAction({
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    // Gateway-specific routing
    const gateway = payload.gateway as string;
    console.log(`[payment webhook] Received from ${gateway}:`, payload);
    // Implementation varies by gateway — log for now
  },
});

// ---------------------------------------------------------------------------
// Internal helpers
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
