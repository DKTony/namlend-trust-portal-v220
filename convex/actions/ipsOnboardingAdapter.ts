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
  buildReqListPsp,
  buildReqListKeys,
  buildStandardHead,
  insertSignature,
  parseIpsAck,
  parseIpsXml,
  type IpsReqRegMobPayload,
  type IpsReqListAccPvdPayload,
  type IpsReqListAccountPayload,
  type IpsReqOtpPayload,
  type IpsReqSetCrePayload,
  generateMsgId,
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
  requestMsgId: string,
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
    rawXml: xmlForLog,
    correlationId,
  });

  const ack = parseIpsAck(ackXml);
  return { ack, durationMs };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function slugProviderHandle(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function supportsDebitCard(mobRegFormat?: string, featureSupported?: string): boolean {
  const source = `${mobRegFormat ?? ''} ${featureSupported ?? ''}`.toUpperCase();
  return source.includes('FORMAT2') || source.includes('FORMAT6') || source.includes('CARD');
}

function supportsWalletPin(mobRegFormat?: string, featureSupported?: string): boolean {
  const source = `${mobRegFormat ?? ''} ${featureSupported ?? ''}`.toUpperCase();
  return source.includes('FORMAT7') || source.includes('WALLET');
}

function deriveVerificationMethods(account: {
  aeba?: string;
  mbeba?: string;
  credsAllowed?: Array<{ type: string; subType: string }>;
}): string[] {
  const methods = new Set<string>();
  const credsAllowed = account.credsAllowed ?? [];

  if (account.mbeba === 'Y') {
    methods.add('mno');
  }

  if (
    account.aeba === 'Y' ||
    credsAllowed.some((cred) =>
      ['ATMPIN', 'CARDDETAILS'].includes((cred.subType ?? '').toUpperCase())
    )
  ) {
    methods.add('debit_card');
  }

  if (!methods.size) {
    methods.add('mno');
  }

  return Array.from(methods);
}

function extractProvidersFromXml(rawXml: string) {
  const parsed = parseIpsXml(rawXml);
  const accountProviderList = (parsed.body.AccPvdList ?? {}) as Record<string, unknown>;

  return toArray((accountProviderList as any).AccPvd).map((provider: any) => ({
    providerCode: provider?.['@_bankCode'] ?? provider?.['@_orgId'] ?? provider?.['@_iin'] ?? '',
    providerName: provider?.['@_name'] ?? provider?.['@_orgId'] ?? 'Unknown Provider',
    providerHandle: slugProviderHandle(provider?.['@_name'] ?? provider?.['@_orgId'] ?? 'provider'),
    providerOrgId: provider?.['@_orgId'],
    providerIfsc: provider?.['@_ifsc'],
    active: provider?.['@_active'],
    mobRegFormat: provider?.['@_mobRegFormat'],
    featureSupported: provider?.['@_featureSupported'],
    supportsDebitCard: supportsDebitCard(
      provider?.['@_mobRegFormat'],
      provider?.['@_featureSupported']
    ),
    supportsWalletPin: supportsWalletPin(
      provider?.['@_mobRegFormat'],
      provider?.['@_featureSupported']
    ),
  }));
}

function extractAccountsFromXml(rawXml: string) {
  const parsed = parseIpsXml(rawXml);
  const accountList = (parsed.body.AccountList ?? {}) as Record<string, unknown>;

  return toArray((accountList as any).Account).map((account: any) => {
    const credsAllowed = toArray(account?.CredsAllowed).map((cred: any) => ({
      type: cred?.['@_type'] ?? '',
      subType: cred?.['@_subType'] ?? '',
      dType: cred?.['@_dType'],
      dLength: cred?.['@_dLength'],
    }));

    const normalized = {
      accountRef: account?.['@_accRefNumber'] ?? '',
      maskedAccountNumber: account?.['@_maskedAccnumber'],
      accountType: account?.['@_accType'],
      accountHolderName: account?.['@_name'],
      ifsc: account?.['@_ifsc'],
      mmid: account?.['@_mmid'],
      aeba: account?.['@_aeba'],
      mbeba: account?.['@_mbeba'],
      aadhaarNo: account?.['@_aadhaarNo'],
      credsAllowed,
    };

    return {
      ...normalized,
      verificationMethods: deriveVerificationMethods(normalized),
    };
  });
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
      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);
      const payload: IpsReqRegMobPayload = {
        mobileNumber: args.mobileNumber,
        providerCode: 'NAMLEND', // Our IPSP code
        accountRef: '', // Not yet selected at this stage
        deviceId: args.deviceId,
      };

      const xml = buildReqRegMob(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqRegMob', xml, msgId, args.applicationId);

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
    applicationId: v.id('ipsOnboardingApplications'),
    mobileNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      const providers = [
        {
          providerCode: 'FIRNNANX',
          providerName: 'First National Bank Namibia',
          providerHandle: 'fnb',
          providerOrgId: 'FIRNNANX',
          providerIfsc: 'FIRNNANX',
          active: 'Y',
          mobRegFormat: 'FORMAT6',
          featureSupported: 'CARD,ACCOUNT',
          supportsDebitCard: true,
          supportsWalletPin: false,
        },
        {
          providerCode: 'SBIANANX',
          providerName: 'Standard Bank Namibia',
          providerHandle: 'standardbank',
          providerOrgId: 'SBIANANX',
          providerIfsc: 'SBIANANX',
          active: 'Y',
          mobRegFormat: 'FORMAT6',
          featureSupported: 'CARD,ACCOUNT',
          supportsDebitCard: true,
          supportsWalletPin: false,
        },
        {
          providerCode: 'NEDBNANX',
          providerName: 'Nedbank Namibia',
          providerHandle: 'nedbank',
          providerOrgId: 'NEDBNANX',
          providerIfsc: 'NEDBNANX',
          active: 'Y',
          mobRegFormat: 'FORMAT7',
          featureSupported: 'WALLET',
          supportsDebitCard: false,
          supportsWalletPin: true,
        },
      ];

      await ctx.runMutation(internal.ips.ipsOnboarding.cacheAvailableSovProviders, {
        applicationId: args.applicationId,
        providers,
      });

      return { providers, mode: 'json_mock' };
    }

    // XML protocol
    try {
      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);
      const payload: IpsReqListAccPvdPayload = {
        mobileNumber: args.mobileNumber,
      };

      const xml = buildReqListAccPvd(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqListAccPvd', xml, msgId, args.applicationId);

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
      const accounts = [
        {
          accountRef: 'ACCT-001',
          maskedAccountNumber: 'XXXXXXXXXX1234',
          accountType: 'SAVINGS',
          accountHolderName: 'Primary Savings',
          ifsc: args.providerCode,
          mmid: '3004010',
          aeba: 'Y',
          mbeba: 'Y',
          credsAllowed: [
            { type: 'OTP', subType: 'SMS', dType: 'Numeric', dLength: '6' },
            { type: 'PIN', subType: 'MPIN', dType: 'Numeric', dLength: '6' },
            { type: 'PIN', subType: 'ATMPIN', dType: 'Numeric', dLength: '6' },
          ],
          verificationMethods: ['mno', 'debit_card'],
        },
        {
          accountRef: 'ACCT-002',
          maskedAccountNumber: 'XXXXXXXXXX5678',
          accountType: 'WALLET',
          accountHolderName: 'MoMo Wallet',
          ifsc: args.providerCode,
          mmid: '3004011',
          aeba: 'N',
          mbeba: 'Y',
          credsAllowed: [
            { type: 'OTP', subType: 'SMS', dType: 'Numeric', dLength: '6' },
            { type: 'PIN', subType: 'WALLETPIN', dType: 'Numeric', dLength: '5' },
          ],
          verificationMethods: ['mno'],
        },
      ];

      await ctx.runMutation(internal.ips.ipsOnboarding.cacheAvailableAccounts, {
        applicationId: args.applicationId,
        accounts,
      });

      return { accounts, mode: 'json_mock' };
    }

    // XML protocol
    try {
      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);
      const payload: IpsReqListAccountPayload = {
        mobileNumber: args.mobileNumber,
        providerCode: args.providerCode,
      };

      const xml = buildReqListAccount(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqListAccount', xml, msgId, args.applicationId);

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
      const msgId = generateMsgId();
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

      const { ack } = await sendSignedXml(ctx, apiName, xml, msgId, args.applicationId);

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
      const msgId = generateMsgId();
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
      const { ack } = await sendSignedXml(
        ctx,
        'ReqOtp',
        xml,
        msgId,
        args.applicationId,
        redactedXml
      );

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
    encryptedNewPin: v.string(),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);

    if (mode === 'json_mock') {
      // Mock: simulate PIN set success — advance to IPS_PIN_SET
      console.log(`[onboarding] Mock ReqSetCre ${args.operation}`);
      await updateStatus(ctx, args.applicationId, 'IPS_PIN_SET');
      return { success: true, mode: 'json_mock' };
    }

    // XML protocol — encrypt PIN server-side using BoN HSM public key
    const hsmPublicKey = process.env.IPS_HSM_PUBLIC_KEY ?? '';
    if (!hsmPublicKey) {
      console.warn(
        `[onboarding] ReqSetCre in ${mode} mode — IPS_HSM_PUBLIC_KEY not configured, using local PIN set`
      );
      await updateStatus(ctx, args.applicationId, 'IPS_PIN_SET');
      return { success: true, note: 'IPS_HSM_PUBLIC_KEY not configured — PIN set locally' };
    }

    try {
      const signer = createSigningProvider();
      const encryptedPin = await signer.encryptPin(args.encryptedNewPin, hsmPublicKey);

      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);

      const payload: IpsReqSetCrePayload = {
        operation: args.operation,
        encryptedNewPin: encryptedPin,
        deviceId: args.deviceId,
      };

      const xml = buildReqSetCre(head, payload);
      const { ack } = await sendSignedXml(ctx, 'ReqSetCre', xml, msgId, args.applicationId);

      if (ack.result === 'SUCCESS') {
        console.log(`[onboarding] ReqSetCre ACK for application`);
        await updateStatus(ctx, args.applicationId, 'IPS_PIN_SET');
        return { success: true };
      } else {
        const errorEntry = getErrorEntry(ack.errorCode ?? 'UNKNOWN');
        await updateStatus(
          ctx,
          args.applicationId,
          'IPS_PIN_SETTING',
          ack.errorCode,
          errorEntry.userMessage
        );
        return { success: false, error: ack.errorDescription };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await updateStatus(ctx, args.applicationId, 'IPS_PIN_SETTING', 'NETWORK_ERROR', msg);
      return { success: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// List PSPs (ReqListPsp) — IPP FSD §4.9
// Lists participating Payment Service Providers registered with IPS.
// ---------------------------------------------------------------------------

export const reqListPsp = internalAction({
  args: {
    pspType: v.optional(v.union(v.literal('BANK'), v.literal('WALLET'), v.literal('ALL'))),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      return {
        success: true,
        mode: 'json_mock',
        psps: [
          { code: 'FNB', name: 'First National Bank Namibia', type: 'BANK' },
          { code: 'STD', name: 'Standard Bank Namibia', type: 'BANK' },
          { code: 'NED', name: 'Nedbank Namibia', type: 'BANK' },
          { code: 'BOW', name: 'Bank Windhoek', type: 'BANK' },
          { code: 'MTC', name: 'MTC Mobile Money', type: 'WALLET' },
          { code: 'TNM', name: 'TN Mobile Money', type: 'WALLET' },
        ],
      };
    }

    try {
      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);
      const xml = buildReqListPsp(head, { pspType: args.pspType });
      const { ack } = await sendSignedXml(ctx, 'ReqListPsp', xml, msgId);

      return {
        success: ack.result === 'SUCCESS',
        errorCode: ack.errorCode,
        errorDescription: ack.errorDescription,
      };
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
// List Key Types (ReqListKeys) — IPP FSD §4.10
// Lists key types available for alias registration (MOBILE, NUMERICID, etc.).
// ---------------------------------------------------------------------------

export const reqListKeys = internalAction({
  args: {
    pspCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = await getProtocolMode(ctx);
    if (mode === 'json_mock') {
      return {
        success: true,
        mode: 'json_mock',
        keyTypes: [
          { type: 'MOBILE', description: 'Mobile Number (+264...)' },
          { type: 'NUMERICID', description: 'National ID Number' },
        ],
      };
    }

    try {
      const msgId = generateMsgId();
      const head = buildStandardHead(msgId);
      const xml = buildReqListKeys(head, { pspCode: args.pspCode });
      const { ack } = await sendSignedXml(ctx, 'ReqListKeys', xml, msgId);

      return {
        success: ack.result === 'SUCCESS',
        errorCode: ack.errorCode,
        errorDescription: ack.errorDescription,
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

export const handleRespListAccPvd = internalAction({
  args: {
    requestMsgId: v.optional(v.string()),
    rawXml: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.requestMsgId || !args.rawXml) return;

    const requestLog = await ctx.runQuery(
      internal.ips.ipsApiLogs.getLatestOutboundApiLogByRequestMsgId,
      {
        requestMsgId: args.requestMsgId,
      }
    );

    if (!requestLog?.correlationId) return;

    const providers = extractProvidersFromXml(args.rawXml);
    await ctx.runMutation(internal.ips.ipsOnboarding.cacheAvailableSovProviders, {
      applicationId: requestLog.correlationId as any,
      providers,
    });
  },
});

export const handleRespListAccount = internalAction({
  args: {
    requestMsgId: v.optional(v.string()),
    rawXml: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.requestMsgId || !args.rawXml) return;

    const requestLog = await ctx.runQuery(
      internal.ips.ipsApiLogs.getLatestOutboundApiLogByRequestMsgId,
      {
        requestMsgId: args.requestMsgId,
      }
    );

    if (!requestLog?.correlationId) return;

    const accounts = extractAccountsFromXml(args.rawXml);
    await ctx.runMutation(internal.ips.ipsOnboarding.cacheAvailableAccounts, {
      applicationId: requestLog.correlationId as any,
      accounts,
    });
  },
});
