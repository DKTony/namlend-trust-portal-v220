'use node';
/**
 * IPS Alias Directory Adapter — handles alias registration, lookup, and porting
 * via IPN's centralized Alias Directory.
 *
 * APIs implemented:
 *   ReqRegMapper  — Register/modify/delete/block alias in central directory
 *   ReqGetAdd     — Check/fetch/port alias from central directory
 *   handleMapperConfirmation — Process async porting confirmations from IPN
 *
 * All use the Phase 1 XML framework (ipsXmlBuilder + ipsSigningProvider).
 */

import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import {
  buildReqRegMapper,
  buildReqGetAdd,
  buildStandardHead,
  insertSignature,
  parseIpsAck,
  parseIpsXml,
  generateMsgId,
  type IpsReqRegMapperPayload,
  type IpsReqGetAddPayload,
} from '../lib/ipsXmlBuilder';
import { createSigningProvider } from '../lib/ipsSigningProvider';
import { getErrorEntry, isSuccess } from '../lib/ipsErrorCodes';
import { parseRespGetAddDetails } from '../lib/ipsResponseParsers';
import { assertIpsProductionReady, type IpsProtocolMode } from '../lib/ipsProductionConfig';

const IPS_BASE_URL = process.env.IPS_BASE_URL ?? 'https://ips.bon.na/api/v2';

// ---------------------------------------------------------------------------
// Internal helper — send signed XML to IPS
// ---------------------------------------------------------------------------

async function sendSignedXml(
  ctx: any,
  apiName: string,
  xml: string,
  requestMsgId: string,
  correlationId?: string
): Promise<{
  ack: import('../lib/ipsXmlBuilder').IpsAckParsed;
  durationMs: number;
}> {
  assertIpsProductionReady(await getProtocolMode(ctx));
  const signer = createSigningProvider();
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

  // Log the API call
  await ctx.runMutation(internal.ips.ipsApiLogs.logApiCall, {
    requestMsgId,
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
// Check protocol mode (same as ipsAdapter)
// ---------------------------------------------------------------------------

async function getProtocolMode(ctx: any): Promise<IpsProtocolMode> {
  try {
    const mode = await ctx.runQuery(internal.lib.ruleEvaluator.getStringRuleQuery, {
      ruleCode: 'IPS_PROTOCOL_MODE',
      fallback: 'json_mock',
    });
    if (mode === 'xml_sandbox' || mode === 'xml_production') return mode;
  } catch {
    // Fall through to mock mode.
  }
  return 'json_mock';
}

// ---------------------------------------------------------------------------
// ReqRegMapper — Register/modify/delete/block alias in IPN directory
// ---------------------------------------------------------------------------

export const reqRegMapper = internalAction({
  args: {
    aliasId: v.id('ipsAliasDirectory'),
    applicationId: v.optional(v.id('ipsOnboardingApplications')),
    operation: v.union(
      v.literal('ADD'),
      v.literal('MODIFY'),
      v.literal('DELETE'),
      v.literal('BLOCK')
    ),
    addr: v.string(),
    entityType: v.union(v.literal('PERSON'), v.literal('ENTITY')),
    idType: v.union(v.literal('MOBILE'), v.literal('NUMERICID')),
    idValue: v.string(),
    linkedAccountRef: v.optional(v.string()),
    linkedBankBic: v.optional(v.string()),
    requestMsgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock: simulate successful registration with a fake cmId
      const mockCmId = `CM-MOCK-${Date.now()}`;
      await ctx.runMutation(internal.ips.ipsAliasDirectory.updateAliasFromIpn, {
        aliasId: args.aliasId,
        status:
          args.operation === 'DELETE'
            ? 'DEREGISTERED'
            : args.operation === 'BLOCK'
              ? 'BLOCKED'
              : 'ACTIVE',
        cmId: mockCmId,
      });
      if (args.applicationId && args.operation === 'ADD') {
        await ctx.runMutation(internal.ips.ipsOnboarding.markAliasRegistered, {
          aliasId: args.aliasId,
        });
      }
      console.log(`[alias] Mock ${args.operation} for ${args.addr} → cmId: ${mockCmId}`);
      return { success: true, cmId: mockCmId };
    }

    // XML protocol
    try {
      const msgId = args.requestMsgId ?? generateMsgId();
      const head = buildStandardHead(msgId);
      const payload: IpsReqRegMapperPayload = {
        operation: args.operation,
        addr: args.addr,
        entityType: args.entityType,
        idType: args.idType,
        idValue: args.idValue,
        linkedAccountRef: args.linkedAccountRef,
        linkedBankBic: args.linkedBankBic,
      };

      const xml = buildReqRegMapper(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqRegMapper', xml, msgId, msgId);

      if (ack.result === 'SUCCESS') {
        // ACK received — actual confirmation will arrive via RespRegMapper callback
        // For now, mark as synced but still NEW (ACTIVE comes from callback)
        console.log(`[alias] ReqRegMapper ${args.operation} ACK received for ${args.addr}`);
        return { success: true, ackResult: ack.result, requestMsgId: msgId };
      } else {
        // ACK rejected — update alias with error
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await ctx.runMutation(internal.ips.ipsAliasDirectory.updateAliasFromIpn, {
          aliasId: args.aliasId,
          status: 'NEW', // stay in NEW on failure
          syncError: ack.errorDescription ?? errorEntry.userMessage,
        });
        if (args.applicationId) {
          await ctx.runMutation(internal.ips.ipsOnboarding.updateOnboardingStatus, {
            applicationId: args.applicationId,
            status: 'ALIAS_REGISTRATION_PENDING',
            errorCode: ack.errorCode,
            errorMessage: ack.errorDescription ?? errorEntry.userMessage,
          });
        }
        return { success: false, error: ack.errorDescription };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await ctx.runMutation(internal.ips.ipsAliasDirectory.updateAliasFromIpn, {
        aliasId: args.aliasId,
        status: 'NEW',
        syncError: `XML protocol error: ${msg}`,
      });
      if (args.applicationId) {
        await ctx.runMutation(internal.ips.ipsOnboarding.updateOnboardingStatus, {
          applicationId: args.applicationId,
          status: 'ALIAS_REGISTRATION_PENDING',
          errorCode: 'NETWORK_ERROR',
          errorMessage: msg,
        });
      }
      return { success: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// ReqGetAdd — Check/fetch/port alias from IPN directory
// ---------------------------------------------------------------------------

export const reqGetAdd = internalAction({
  args: {
    operation: v.union(v.literal('CHECK'), v.literal('FETCH'), v.literal('PORT')),
    addr: v.optional(v.string()),
    idType: v.optional(v.union(v.literal('MOBILE'), v.literal('NUMERICID'))),
    idValue: v.optional(v.string()),
    correlationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock responses per operation
      if (args.operation === 'CHECK') {
        return { exists: false, available: true, mode: 'json_mock' };
      }
      if (args.operation === 'FETCH') {
        return {
          found: true,
          addr: args.addr,
          name: 'Mock Account Holder',
          bankBic: 'FIRNNANX',
          accountRef: 'MOCK-ACCT-001',
          mode: 'json_mock',
        };
      }
      return { success: true, mode: 'json_mock' };
    }

    // XML protocol
    try {
      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);
      const payload: IpsReqGetAddPayload = {
        operation: args.operation,
        addr: args.addr,
        idType: args.idType,
        idValue: args.idValue,
      };

      const xml = buildReqGetAdd(head, payload);
      const { ack } = await sendSignedXml(
        ctx,
        'ReqGetAdd',
        xml,
        msgId,
        args.correlationId ?? msgId
      );

      if (ack.result !== 'SUCCESS') {
        return {
          ackSuccess: false,
          errorCode: ack.errorCode,
          errorDescription: ack.errorDescription,
          lookupStatus: 'failed' as const,
        };
      }

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const callbackLog = await ctx.runQuery(
          internal.ips.ipsApiLogs.getLatestCallbackApiLogByRequestMsgId,
          {
            requestMsgId: msgId,
          }
        );

        if (callbackLog?.apiName !== 'RespGetAdd' || !callbackLog.rawXml) {
          continue;
        }

        const details = parseRespGetAddDetails(callbackLog.rawXml);
        const resolved = details.result === 'SUCCESS';
        const available =
          args.operation === 'CHECK'
            ? resolved && (details.idStatus ?? '').toUpperCase() === 'NEW'
            : undefined;

        return {
          ackSuccess: true,
          lookupStatus: resolved ? ('resolved' as const) : ('failed' as const),
          errorCode: details.errorCode,
          errorDescription: details.errorDescription,
          result: details.result,
          operation: details.operation ?? args.operation,
          addr: details.addr ?? args.addr,
          entityType: details.entityType,
          idStatus: details.idStatus,
          channel: details.channel,
          lastUpdatedTs: details.lastUpdatedTs,
          mobileNumber: details.mobileNumber,
          numericId: details.numericId,
          available,
          found: args.operation !== 'CHECK' ? resolved : undefined,
        };
      }

      return {
        ackSuccess: true,
        errorCode: 'PENDING_CALLBACK',
        errorDescription:
          'IPS accepted the alias lookup request but the detailed response has not arrived yet.',
        lookupStatus: 'pending' as const,
      };
    } catch (error) {
      return {
        ackSuccess: false,
        errorCode: 'NETWORK_ERROR',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
        lookupStatus: 'failed' as const,
      };
    }
  },
});

export const checkAliasAvailabilityForOnboarding = internalAction({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    addr: v.string(),
    requestMsgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result: any = await ctx.runAction(internal.actions.ipsAliasAdapter.reqGetAdd, {
      operation: 'CHECK',
      addr: args.addr,
      correlationId: args.requestMsgId ?? args.applicationId,
    });

    if (result.lookupStatus === 'pending') {
      await ctx.runMutation(internal.ips.ipsOnboarding.updateAliasAvailabilityStatus, {
        applicationId: args.applicationId,
        status: 'pending',
        requestMsgId: args.requestMsgId,
        errorCode: result.errorCode,
        errorMessage: result.errorDescription,
      });
      return result;
    }

    await ctx.runMutation(internal.ips.ipsOnboarding.updateAliasAvailabilityStatus, {
      applicationId: args.applicationId,
      status: result.available
        ? 'available'
        : result.ackSuccess === false
          ? 'failed'
          : 'unavailable',
      requestMsgId: args.requestMsgId,
      errorCode: result.errorCode,
      errorMessage: result.errorDescription,
    });

    return result;
  },
});

// ---------------------------------------------------------------------------
// Handle RespRegMapper callback (IPN confirms alias operation)
// ---------------------------------------------------------------------------

export const handleRespRegMapper = internalAction({
  args: {
    msgId: v.string(),
    requestMsgId: v.optional(v.string()),
    respCode: v.optional(v.string()),
    respDescription: v.optional(v.string()),
    rawXml: v.optional(v.string()),
    txnData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log(`[alias] RespRegMapper for msgId ${args.msgId}: code=${args.respCode}`);

    // Parse additional data from the XML response
    let cmId: string | undefined;
    let addr: string | undefined;

    if (args.rawXml) {
      try {
        const parsed = parseIpsXml(args.rawXml);
        cmId = (parsed.txn?.CmId as string | undefined) ?? (parsed.txn?.cmId as string | undefined);
        addr = (parsed.txn?.Addr as string | undefined) ?? (parsed.txn?.addr as string | undefined);
      } catch (e) {
        console.warn('[alias] Failed to parse RespRegMapper XML:', e);
      }
    }

    // Look up the alias by addr
    if (addr) {
      const alias = await ctx.runQuery(internal.ips.ipsAliasDirectory.getAliasByAddrInternal, {
        addr,
      });

      if (alias) {
        const success = isSuccess(args.respCode ?? '');
        const nextStatus = success
          ? alias.status === 'DEREGISTERED'
            ? 'DEREGISTERED'
            : alias.status === 'BLOCKED'
              ? 'BLOCKED'
              : 'ACTIVE'
          : alias.status;
        await ctx.runMutation(internal.ips.ipsAliasDirectory.updateAliasFromIpn, {
          aliasId: alias._id,
          status: nextStatus,
          cmId: cmId ?? alias.cmId,
          syncError: success ? undefined : (args.respDescription ?? 'Registration failed'),
        });

        if (success && nextStatus === 'ACTIVE') {
          await ctx.runMutation(internal.ips.ipsOnboarding.markAliasRegistered, {
            aliasId: alias._id,
          });
        }
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Handle RespGetAdd callback (IPN returns alias lookup result)
// ---------------------------------------------------------------------------

export const handleRespGetAdd = internalAction({
  args: {
    msgId: v.string(),
    requestMsgId: v.optional(v.string()),
    respCode: v.optional(v.string()),
    respDescription: v.optional(v.string()),
    rawXml: v.optional(v.string()),
    txnData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log(`[alias] RespGetAdd for msgId ${args.msgId}: code=${args.respCode}`);

    // Parse the response XML for alias details
    if (args.rawXml) {
      try {
        const parsed = parseRespGetAddDetails(args.rawXml);
        await ctx.runMutation(internal.ips.ipsApiLogs.logApiCall, {
          requestMsgId: args.requestMsgId,
          method: 'CALLBACK',
          endpoint: '/webhook/ips/RespGetAdd',
          requestBody: { msgId: args.msgId },
          responseBody: parsed,
          direction: 'CALLBACK' as const,
          contentType: 'xml' as const,
          apiName: 'RespGetAdd',
          rawXml: args.rawXml,
          correlationId: args.msgId,
        });
      } catch (e) {
        console.warn('[alias] Failed to parse RespGetAdd XML:', e);
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Handle ReqMapperConfirmation (IPN notifies us of porting)
// ---------------------------------------------------------------------------

export const handleMapperConfirmation = internalAction({
  args: {
    msgId: v.string(),
    respCode: v.optional(v.string()),
    respDescription: v.optional(v.string()),
    rawXml: v.optional(v.string()),
    txnData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log(`[alias] ReqMapperConfirmation for msgId ${args.msgId}: porting notification`);

    // Parse the XML to find which alias is being ported away
    let addr: string | undefined;

    if (args.rawXml) {
      try {
        const parsed = parseIpsXml(args.rawXml);
        addr = (parsed.txn?.Addr as string | undefined) ?? (parsed.txn?.addr as string | undefined);
      } catch (e) {
        console.warn('[alias] Failed to parse MapperConfirmation XML:', e);
      }
    }

    if (addr) {
      const alias = await ctx.runQuery(internal.ips.ipsAliasDirectory.getAliasByAddrInternal, {
        addr,
      });

      if (alias) {
        // Mark as PORTED — the alias now belongs to another IPSP
        await ctx.runMutation(internal.ips.ipsAliasDirectory.updateAliasFromIpn, {
          aliasId: alias._id,
          status: 'PORTED',
        });
        console.log(`[alias] Alias ${addr} marked as PORTED (moved to another IPSP)`);
      }
    }
  },
});
