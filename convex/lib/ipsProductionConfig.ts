import { ConvexError } from 'convex/values';

export type IpsProtocolMode = 'json_mock' | 'xml_sandbox' | 'xml_production';

export interface PortalFlowDefaults {
  collectionsVpa: string;
  disbursementsVpa: string;
  repaymentPurposeCode: string;
  disbursementPurposeCode: string;
  repaymentInitiationMode: string;
  disbursementInitiationMode: string;
  webChannel: string;
}

function present(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function getPortalFlowDefaults(): PortalFlowDefaults {
  return {
    collectionsVpa: process.env.IPS_COLLECTIONS_VPA ?? 'collections@namlend',
    disbursementsVpa: process.env.IPS_DISBURSEMENTS_VPA ?? 'disbursements@namlend',
    repaymentPurposeCode: process.env.IPS_REPAYMENT_PURPOSE_CODE ?? 'P2P',
    disbursementPurposeCode: process.env.IPS_DISBURSEMENT_PURPOSE_CODE ?? 'B2P',
    repaymentInitiationMode: process.env.IPS_REPAYMENT_INITIATION_MODE ?? 'WEB',
    disbursementInitiationMode: process.env.IPS_DISBURSEMENT_INITIATION_MODE ?? 'BACKOFFICE',
    webChannel: process.env.IPS_PORTAL_CHANNEL ?? 'WEB',
  };
}

export function assertIpsProductionReady(mode: IpsProtocolMode): void {
  if (mode !== 'xml_production') return;

  const required = [
    'IPS_BASE_URL',
    'IPS_CLIENT_CERT',
    'IPS_CLIENT_KEY',
    'IPS_BON_PUBLIC_CERT',
    'IPS_KEY_ID',
    'IPS_ORG_ID',
    'IPS_PARTICIPANT_ORG_ID',
    'IPS_BANK_CODE',
    'IPS_COLLECTIONS_VPA',
    'IPS_DISBURSEMENTS_VPA',
    'IPS_SPONSOR_PARTICIPANT_CODE',
  ];

  const missing = required.filter((key) => !present(process.env[key]));
  const signingMode = process.env.IPS_SIGNING_MODE ?? 'software';
  if (signingMode === 'hsm') {
    if (!present(process.env.IPS_HSM_KEY_ID)) missing.push('IPS_HSM_KEY_ID');
    if (!present(process.env.IPS_HSM_PUBLIC_KEY)) missing.push('IPS_HSM_PUBLIC_KEY');
  } else if (!present(process.env.IPS_SIGNING_PRIVATE_KEY)) {
    missing.push('IPS_SIGNING_PRIVATE_KEY');
  }

  const credentialMode = process.env.IPS_CREDENTIAL_MODE ?? process.env.IPS_CL_MODE;
  if (!present(credentialMode)) {
    missing.push('IPS_CREDENTIAL_MODE');
  }

  if (missing.length) {
    throw new ConvexError({
      code: 'IPS_PRODUCTION_CONFIG_MISSING',
      message: `IPS production mode is missing required configuration: ${missing.join(', ')}`,
      missing,
    });
  }
}

export function assertRawPinAllowed(mode: IpsProtocolMode): void {
  if (mode === 'json_mock' || process.env.IPS_ALLOW_RAW_PIN_E2E === 'true') return;

  throw new ConvexError({
    code: 'RAW_PIN_NOT_ALLOWED',
    message: 'Raw IPS PIN submission is allowed only in mock/E2E mode.',
  });
}

export function requireProductionWebhookCert(mode: IpsProtocolMode): void {
  if (mode === 'xml_production' && !present(process.env.IPS_BON_PUBLIC_CERT)) {
    throw new ConvexError({
      code: 'IPS_WEBHOOK_CERT_MISSING',
      message: 'IPS_BON_PUBLIC_CERT is required in production XML mode.',
    });
  }
}
