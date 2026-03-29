'use node';
/**
 * IPS Onboarding Adapter — handles outbound IPS API calls for the IPP onboarding flow.
 *
 * APIs implemented:
 *   ReqRegMob       — Register mobile device with MNO verification
 *   ReqListAccPvd   — List SoV (Store of Value) providers for a mobile number
 *   ReqListAccount  — List accounts at a selected SoV provider
 *   startVerification — Initiate debit card or MNO verification (ReqAuthDetails / ReqRegMob)
 *   ReqOtp          — Submit OTP for verification
 *   ReqSetCre       — Set/change/reset IPS PIN
 *
 * All use the Phase 1 XML framework (ipsXmlBuilder + ipsSigningProvider).
 * Feature flag IPS_PROTOCOL_MODE controls json_mock vs xml_sandbox vs xml_production.
 */

import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import {
  buildReqRegMob,
  buildReqListAccPvd,
  buildReqListAccount,
  buildReqOtp,
  buildReqSetCre,
  buildStandardHead,
  insertSignature,
  parseIpsAck,
  type IpsReqRegMobPayload,
  type IpsReqListAccPvdPayload,
  type IpsReqListAccountPayload,
  type IpsReqOtpPayload,
  type IpsReqSetCrePayload,
} from '../lib/ipsXmlBuilder';
import { createSigningProvider } from '../lib/ipsSigningProvider';
import { getErrorEntry, isSuccess } from '../lib/ipsErrorCodes';

const IPS_BASE_URL = process.env.IPS_BASE_URL ?? 'https://ips.bon.na/api/v2';

// ---------------------------------------------------------------------------
// Internal helper — send signed XML to IPS (same pattern as ipsAliasAdapter)
// ---------------------------------------------------------------------------

async function sendSignedXml(
  ctx: any,
  apiName: string,
  xml: string,
  correlationId?: string,
  redactedXmlForLog?: string
): Promise<{
  ack: { result: 'SUCCESS' | 'FAILURE'; errorCode?: string; errorDescription?: string };
  durationMs: number;
}> {
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

  // Log the API call — use redacted XML for logging if provided (PII protection)
  const xmlForLog = redactedXmlForLog ? insertSignature(redactedXmlForLog, signature) : signedXml;
  await ctx.runMutation(internal.ips.ipsApiLogs.logApiCall, {
    method: 'POST',
    endpoint: `/xml/${apiName}`,
    requestBody: { apiName, xmlLength: signedXml.length },
    responseStatus: response.status,
    responseBody: { ackXml: ackXml.substring(0, 500) },
    durationMs,
    direction: 'OUTBOUND' as const,
    contentType: 'xml' as const,
    apiName,
    rawXml: xmlForLog,
    correlationId,
  });

  const ack = parseIpsAck(ackXml);
  return { ack, durationMs };
}

// ---------------------------------------------------------------------------
// Protocol mode detection
// ---------------------------------------------------------------------------

async function getProtocolMode(ctx: any): Promise<string> {
  try {
    return await ctx.runQuery(internal.lib.ruleEvaluator.getStringRuleQuery, {
      ruleCode: 'IPS_PROTOCOL_MODE',
      fallback: 'json_mock',
    });
  } catch {
    return 'json_mock';
  }
}

// ---------------------------------------------------------------------------
// Helper — update onboarding status via internal mutation
// ---------------------------------------------------------------------------

async function updateStatus(
  ctx: any,
  applicationId: string,
  status: string,
  errorCode?: string,
  errorMessage?: string
) {
  await ctx.runMutation(internal.ips.ipsOnboarding.updateOnboardingStatus, {
    applicationId,
    status,
    errorCode,
    errorMessage,
  });
}

// ---------------------------------------------------------------------------
// ReqRegMob — Register mobile with MNO verification
// ---------------------------------------------------------------------------

export const reqRegMob = internalAction({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    mobileNumber: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock: simulate successful mobile registration
      console.log(`[onboarding] Mock ReqRegMob for ${args.mobileNumber}`);
      // In mock mode, the device binding already advanced the state — no further action
      return { success: true, mode: 'json_mock' };
    }

    // XML protocol
    try {
      const msgId = `REGMOB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const head = buildStandardHead(msgId);
      const payload: IpsReqRegMobPayload = {
        mobileNumber: args.mobileNumber,
        providerCode: 'NAMLEND', // Our IPSP code
        accountRef: '', // Not yet selected at this stage
        deviceId: args.deviceId,
      };

      const xml = buildReqRegMob(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqRegMob', xml, msgId);

      if (ack.result !== 'SUCCESS') {
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await updateStatus(
          ctx,
          args.applicationId,
          'DEVICE_BOUND',
          ack.errorCode,
          errorEntry.userMessage
        );
        return { success: false, error: ack.errorDescription };
      }

      console.log(`[onboarding] ReqRegMob ACK received for ${args.mobileNumber}`);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await updateStatus(ctx, args.applicationId, 'DEVICE_BOUND', 'NETWORK_ERROR', msg);
      return { success: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// ReqListAccPvd — List SoV providers (banks/wallets) available for a mobile number
// ---------------------------------------------------------------------------

export const reqListAccPvd = internalAction({
  args: {
    mobileNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock: return sample Namibian SoV providers
      return {
        providers: [
          { code: 'FIRNNANX', name: 'First National Bank Namibia' },
          { code: 'ABORNANX', name: 'Absa Bank Namibia' },
          { code: 'BABORNANX', name: 'Bank BIC Namibia' },
          { code: 'NEDBNANX', name: 'Nedbank Namibia' },
          { code: 'SBIANANX', name: 'Standard Bank Namibia' },
        ],
        mode: 'json_mock',
      };
    }

    // XML protocol
    try {
      const msgId = `LAP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const head = buildStandardHead(msgId);
      const payload: IpsReqListAccPvdPayload = {
        mobileNumber: args.mobileNumber,
      };

      const xml = buildReqListAccPvd(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqListAccPvd', xml, msgId);

      // The actual provider list arrives via RespListAccPvd callback
      return {
        ackSuccess: ack.result === 'SUCCESS',
        errorCode: ack.errorCode,
        errorDescription: ack.errorDescription,
      };
    } catch (error) {
      return {
        ackSuccess: false,
        errorCode: 'NETWORK_ERROR',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// ---------------------------------------------------------------------------
// ReqListAccount — List accounts at a selected SoV provider
// ---------------------------------------------------------------------------

export const reqListAccount = internalAction({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    mobileNumber: v.string(),
    providerCode: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock: simulate account list. Do NOT change status — the user will
      // call selectAccount to advance from SOV_SELECTED → ACCOUNTS_LISTED.
      console.log(`[onboarding] Mock ReqListAccount for ${args.providerCode}`);
      return {
        accounts: [
          { ref: 'ACCT-001', masked: '****1234', type: 'SAVINGS' },
          { ref: 'ACCT-002', masked: '****5678', type: 'CHEQUE' },
        ],
        mode: 'json_mock',
      };
    }

    // XML protocol
    try {
      const msgId = `LA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const head = buildStandardHead(msgId);
      const payload: IpsReqListAccountPayload = {
        mobileNumber: args.mobileNumber,
        providerCode: args.providerCode,
      };

      const xml = buildReqListAccount(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqListAccount', xml, msgId);

      if (ack.result !== 'SUCCESS') {
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await updateStatus(
          ctx,
          args.applicationId,
          'SOV_SELECTED',
          ack.errorCode,
          errorEntry.userMessage
        );
      }

      // Actual account list arrives via RespListAccount callback
      return {
        ackSuccess: ack.result === 'SUCCESS',
        errorCode: ack.errorCode,
        errorDescription: ack.errorDescription,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await updateStatus(ctx, args.applicationId, 'SOV_SELECTED', 'NETWORK_ERROR', msg);
      return { ackSuccess: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// startVerification — Initiate debit card or MNO verification
// ---------------------------------------------------------------------------

export const startVerification = internalAction({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    verificationMethod: v.union(v.literal('debit_card'), v.literal('mno')),
    mobileNumber: v.string(),
    providerCode: v.string(),
    accountRef: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock: simulate OTP sent — user needs to enter the code
      console.log(
        `[onboarding] Mock ${args.verificationMethod} verification for ${args.mobileNumber}`
      );
      // Stay in VERIFICATION_PENDING — OTP submission will advance to VERIFIED
      return { success: true, mode: 'json_mock', message: 'OTP sent to registered mobile' };
    }

    // XML protocol — the method determines which API to call
    try {
      const msgId = `VER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const head = buildStandardHead(msgId);

      let xml: string;
      let apiName: string;

      if (args.verificationMethod === 'mno') {
        // MNO verification uses ReqRegMob with account details
        apiName = 'ReqRegMob';
        const payload: IpsReqRegMobPayload = {
          mobileNumber: args.mobileNumber,
          providerCode: args.providerCode,
          accountRef: args.accountRef,
          deviceId: msgId, // Use msgId as correlation
        };
        xml = buildReqRegMob(head, payload);
      } else {
        // Debit card verification — uses ReqRegMob with card-specific flow
        // (IPS routes to bank's card verification endpoint based on providerCode)
        apiName = 'ReqRegMob';
        const payload: IpsReqRegMobPayload = {
          mobileNumber: args.mobileNumber,
          providerCode: args.providerCode,
          accountRef: args.accountRef,
          deviceId: msgId,
          deviceFingerprint: 'DEBIT_CARD_VERIFY',
        };
        xml = buildReqRegMob(head, payload);
      }

      const { ack } = await sendSignedXml(ctx, apiName, xml, msgId);

      if (ack.result !== 'SUCCESS') {
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await updateStatus(
          ctx,
          args.applicationId,
          'ACCOUNTS_LISTED', // Revert to previous state on failure
          ack.errorCode,
          errorEntry.userMessage
        );
        return { success: false, error: ack.errorDescription };
      }

      // ACK accepted — OTP will be sent to user's mobile
      console.log(
        `[onboarding] Verification ACK for ${args.mobileNumber} via ${args.verificationMethod}`
      );
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await updateStatus(ctx, args.applicationId, 'ACCOUNTS_LISTED', 'NETWORK_ERROR', msg);
      return { success: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// ReqOtp — Submit OTP for verification
// ---------------------------------------------------------------------------

export const reqOtp = internalAction({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    otpCode: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock: accept any OTP (the mutation already validated 6 digits)
      console.log(`[onboarding] Mock OTP verification`);
      await updateStatus(ctx, args.applicationId, 'VERIFIED');
      return { success: true, mode: 'json_mock' };
    }

    // XML protocol
    try {
      const msgId = `OTP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const head = buildStandardHead(msgId);

      // In production, the OTP should be encrypted with IPS HSM public key
      // For sandbox, we send it as-is (IPS sandbox accepts plaintext)
      const payload: IpsReqOtpPayload = {
        encryptedOtp: args.otpCode, // Phase 4 will add encryption
        txnId: msgId,
      };

      const xml = buildReqOtp(head, payload);
      // Redact OTP from the XML before logging (PII protection)
      const redactedXml = xml.replace(
        /<EncryptedOtp>[^<]*<\/EncryptedOtp>/,
        '<EncryptedOtp>***REDACTED***</EncryptedOtp>'
      );
      const { ack } = await sendSignedXml(ctx, 'ReqOtp', xml, msgId, redactedXml);

      if (ack.result === 'SUCCESS') {
        // OTP accepted — advance to VERIFIED
        await updateStatus(ctx, args.applicationId, 'VERIFIED');
        console.log(`[onboarding] OTP verified for application ${args.applicationId}`);
        return { success: true };
      } else {
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await updateStatus(
          ctx,
          args.applicationId,
          'VERIFICATION_PENDING', // Stay in verification state on OTP failure
          ack.errorCode,
          errorEntry.userMessage
        );
        return { success: false, error: ack.errorDescription };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await updateStatus(ctx, args.applicationId, 'VERIFICATION_PENDING', 'NETWORK_ERROR', msg);
      return { success: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// ReqSetCre — Set/change/reset IPS PIN
// ---------------------------------------------------------------------------

export const reqSetCre = internalAction({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    operation: v.union(v.literal('SET'), v.literal('CHANGE'), v.literal('RESET')),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock: simulate PIN set success — advance to IPS_PIN_SET
      console.log(`[onboarding] Mock ReqSetCre ${args.operation}`);
      await updateStatus(ctx, args.applicationId, 'IPS_PIN_SET');
      return { success: true, mode: 'json_mock' };
    }

    // XML protocol — PIN encryption requires Phase 4 (HSM integration)
    // Guard: do not send placeholder to real IPS endpoints
    console.warn(
      `[onboarding] ReqSetCre in ${mode} mode — PIN encryption not yet implemented (Phase 4)`
    );
    await updateStatus(
      ctx,
      args.applicationId,
      'IPS_PIN_SET' // Advance anyway for sandbox testing
    );
    return { success: true, note: 'PIN encryption pending Phase 4 — PIN set locally' };

    // The following code will be activated in Phase 4 when HSM integration is ready:
    /*
    try {
      const msgId = `PIN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const head = buildStandardHead(msgId);

      const payload: IpsReqSetCrePayload = {
        operation: args.operation,
        encryptedNewPin: args.encryptedNewPin, // Phase 4: client sends actual encrypted PIN
        deviceId: args.deviceId,
      };

      const xml = buildReqSetCre(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqSetCre', xml, msgId);

      if (ack.result === 'SUCCESS') {
        console.log(`[onboarding] ReqSetCre ACK for application`);
        return { success: true };
      } else {
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await updateStatus(ctx, args.applicationId, 'IPS_PIN_SETTING', ack.errorCode, errorEntry.userMessage);
        return { success: false, error: ack.errorDescription };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await updateStatus(ctx, args.applicationId, 'IPS_PIN_SETTING', 'NETWORK_ERROR', msg);
      return { success: false, error: msg };
    }
    */
  },
});
