import { parseIpsXml } from './ipsXmlBuilder';

export type IpsValidationStatus = 'validated' | 'pending' | 'invalid';

export interface ParsedRespValAddDetails {
  requestMsgId?: string;
  result: string;
  errorCode?: string;
  errorDescription?: string;
  accountHolderName?: string;
  ifscCode?: string;
  providerCode?: string;
  providerName?: string;
  addr?: string;
  entityType?: string;
  cmId?: string;
}

export interface ParsedRespChkTxnDetails {
  requestMsgId?: string;
  result: string;
  errorCode?: string;
  errorDescription?: string;
  orgMsgId?: string;
  orgTxnId?: string;
  payerRespCode?: string;
  payeeRespCode?: string;
  primaryRespCode?: string;
  payerAddr?: string;
  payeeAddr?: string;
}

export interface ParsedRespGetAddDetails {
  requestMsgId?: string;
  result: string;
  errorCode?: string;
  errorDescription?: string;
  operation?: string;
  addr?: string;
  entityType?: string;
  idStatus?: string;
  lastUpdatedTs?: string;
  channel?: string;
  ids: Array<{ name?: string; value?: string; seqNum?: string }>;
  mobileNumber?: string;
  numericId?: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function isAliasUsable(status?: string, syncedWithIps?: boolean): boolean {
  return status === 'ACTIVE' && Boolean(syncedWithIps);
}

export function getAliasAvailabilityReason(
  status?: string,
  syncedWithIps?: boolean
): string | undefined {
  if (isAliasUsable(status, syncedWithIps)) {
    return undefined;
  }

  if (!status) {
    return 'Alias status is unknown.';
  }

  if (status !== 'ACTIVE') {
    return `Alias is ${status.toLowerCase()} and cannot be used for payments yet.`;
  }

  if (!syncedWithIps) {
    return 'Alias is still awaiting IPS confirmation.';
  }

  return 'Alias is not available for payments.';
}

export function parseRespValAddDetails(rawXml: string): ParsedRespValAddDetails {
  const parsed = parseIpsXml(rawXml);
  const resp = (parsed.resp ?? {}) as Record<string, unknown>;
  const merchant = (resp.Merchant ?? {}) as Record<string, unknown>;
  const merchantName = (merchant.Name ?? {}) as Record<string, unknown>;

  return {
    requestMsgId: resp['@_reqMsgId'] as string | undefined,
    result: String(resp['@_result'] ?? ''),
    errorCode: (resp['@_errCode'] as string | undefined) ?? (resp['@_code'] as string | undefined),
    errorDescription:
      (resp['@_errMsg'] as string | undefined) ??
      (resp['@_errDesc'] as string | undefined) ??
      undefined,
    accountHolderName:
      (resp['@_maskName'] as string | undefined) ??
      (resp['@_name'] as string | undefined) ??
      (merchantName['@_legal'] as string | undefined) ??
      (merchantName['@_brand'] as string | undefined),
    ifscCode: (resp['@_IFSC'] as string | undefined) ?? (resp['@_ifsc'] as string | undefined),
    providerCode: (resp['@_IIN'] as string | undefined) ?? (resp['@_iin'] as string | undefined),
    providerName:
      (resp['@_IFSC'] as string | undefined) ?? (resp['@_IIN'] as string | undefined) ?? undefined,
    addr: (resp['@_addr'] as string | undefined) ?? (resp['@_vpa'] as string | undefined),
    entityType: (resp['@_type'] as string | undefined) ?? undefined,
    cmId: (resp['@_cmId'] as string | undefined) ?? undefined,
  };
}

export function parseRespChkTxnDetails(rawXml: string): ParsedRespChkTxnDetails {
  const parsed = parseIpsXml(rawXml);
  const txn = parsed.txn ?? {};
  const resp = parsed.resp ?? {};
  const refs = toArray((resp as Record<string, unknown>).Ref).map((ref) => toRecord(ref));
  const payerRef = refs.find((ref) => String(ref['@_type'] ?? '').toUpperCase() === 'PAYER');
  const payeeRef = refs.find((ref) => String(ref['@_type'] ?? '').toUpperCase() === 'PAYEE');

  return {
    requestMsgId: resp['@_reqMsgId'] as string | undefined,
    result: String(resp['@_result'] ?? ''),
    errorCode: resp['@_errCode'] as string | undefined,
    errorDescription: resp['@_errMsg'] as string | undefined,
    orgMsgId: txn['@_orgMsgId'] as string | undefined,
    orgTxnId: txn['@_orgTxnId'] as string | undefined,
    payerRespCode: payerRef?.['@_respCode'] as string | undefined,
    payeeRespCode: payeeRef?.['@_respCode'] as string | undefined,
    primaryRespCode:
      (payeeRef?.['@_respCode'] as string | undefined) ??
      (payerRef?.['@_respCode'] as string | undefined) ??
      (resp['@_errCode'] as string | undefined),
    payerAddr: payerRef?.['@_addr'] as string | undefined,
    payeeAddr: payeeRef?.['@_addr'] as string | undefined,
  };
}

export function parseRespGetAddDetails(rawXml: string): ParsedRespGetAddDetails {
  const parsed = parseIpsXml(rawXml);
  const txn = parsed.txn ?? {};
  const resp = parsed.resp ?? {};
  const regIdDetails = toRecord((resp as Record<string, unknown>).RegIdDetails);
  const ids = toArray(regIdDetails.Id).map((id) => {
    const record = toRecord(id);
    return {
      name: record['@_name'] as string | undefined,
      value: record['@_value'] as string | undefined,
      seqNum: record['@_seqNum'] as string | undefined,
    };
  });

  return {
    requestMsgId: resp['@_reqMsgId'] as string | undefined,
    result: String(resp['@_result'] ?? ''),
    errorCode: resp['@_errCode'] as string | undefined,
    errorDescription:
      (resp['@_errMsg'] as string | undefined) ?? (resp['@_errDesc'] as string | undefined),
    operation: txn['@_type'] as string | undefined,
    addr: regIdDetails['@_addr'] as string | undefined,
    entityType: regIdDetails['@_type'] as string | undefined,
    idStatus: regIdDetails['@_idStatus'] as string | undefined,
    lastUpdatedTs: regIdDetails['@_lastUpdatedTs'] as string | undefined,
    channel: regIdDetails['@_channel'] as string | undefined,
    ids,
    mobileNumber: ids.find((id) => id.name === 'MOBILE')?.value,
    numericId: ids.find((id) => id.name === 'NUMERICID')?.value,
  };
}
