/**
 * IPS XML Builder — constructs and parses IPS XML messages.
 *
 * Extends the existing xmlEscape.ts utility (proven in pacs.009 generation)
 * into IPS-specific request/response XML envelopes.
 *
 * All 17 IPS APIs share the same XML structure:
 *   <upi:{ApiName}>
 *     <Head ver="2.0" ts="..." orgId="..." msgId="..." .../>
 *     <Txn ...> (API-specific payload) </Txn>
 *     <Signature> (RSA-SHA256, added by signing layer) </Signature>
 *   </upi:{ApiName}>
 *
 * ACK responses from IPS follow a simpler structure:
 *   <upi:Ack api="{ApiName}" reqMsgId="..." ...>
 *     <Head .../>
 *     <Txn .../>
 *   </upi:Ack>
 */

import { xmlEscape } from './xmlEscape';

// ---------------------------------------------------------------------------
// XML Namespace — configurable per IPS TSD §2.1
// Default: spec-mandated "http://npci.org/upi/schema/" (UPI heritage)
// Override via IPS_XML_NAMESPACE env var if BoN issues a Namibian namespace
// ---------------------------------------------------------------------------

const IPS_XML_NAMESPACE = process.env.IPS_XML_NAMESPACE ?? 'http://npci.org/upi/schema/';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IpsXmlHead {
  /** API version — typically "2.0" */
  ver: string;
  /** ISO 8601 timestamp */
  ts: string;
  /** Organization ID (NamLend's IPSP code) */
  orgId: string;
  /** Unique message identifier for idempotency */
  msgId: string;
  /** Transaction ID (may differ from msgId for collect flows) */
  txnId?: string;
  /** API name (e.g., "ReqPay", "ReqValAdd") */
  api?: string;
}

export interface IpsPayerPayee {
  addr: string;
  name?: string;
  sovPrvd?: string;
  account?: string;
  bic?: string;
}

export interface IpsReqPayPayload {
  type: 'PAY' | 'COLLECT';
  subType?: 'DEBIT' | 'CREDIT';
  payer: IpsPayerPayee;
  payee: IpsPayerPayee;
  amount: number;
  currency: string;
  purposeCode?: string;
  initMode?: string;
  note?: string;
  encryptedPin?: string;
}

export interface IpsReqValAddPayload {
  addr: string;
}

export interface IpsReqChkTxnPayload {
  orgTxnId: string;
  orgMsgId: string;
}

export interface IpsReqHbtPayload {
  orgId: string;
}

export interface IpsReqRegMapperPayload {
  operation: 'ADD' | 'MODIFY' | 'DELETE' | 'BLOCK';
  addr: string;
  entityType: 'PERSON' | 'ENTITY';
  idType: 'MOBILE' | 'NUMERICID';
  idValue: string;
  linkedAccountRef?: string;
  linkedBankBic?: string;
}

export interface IpsReqGetAddPayload {
  operation: 'CHECK' | 'FETCH' | 'PORT';
  addr?: string;
  idType?: 'MOBILE' | 'NUMERICID';
  idValue?: string;
}

export interface IpsReqSetCrePayload {
  operation: 'SET' | 'CHANGE' | 'RESET';
  encryptedNewPin: string;
  encryptedOldPin?: string;
  deviceId: string;
}

export interface IpsReqRegMobPayload {
  mobileNumber: string;
  providerCode: string;
  accountRef: string;
  deviceId: string;
  deviceFingerprint?: string;
}

export interface IpsReqOtpPayload {
  encryptedOtp: string;
  txnId: string;
}

export interface IpsReqBalEnqPayload {
  addr: string;
  sovPrvd: string;
  account: string;
}

export interface IpsReqListAccPvdPayload {
  mobileNumber: string;
}

export interface IpsReqListAccountPayload {
  mobileNumber: string;
  providerCode: string;
}

// Phase 4B: New API payload types

export interface IpsReqRevPayload {
  /** Original transaction ID to reverse */
  orgTxnId: string;
  /** Original message ID */
  orgMsgId: string;
  /** Reversal type */
  revType: 'FULL' | 'PARTIAL';
  /** Amount to reverse (for partial reversals) */
  amount?: number;
  currency?: string;
  /** Reason code per IPP FSD §4.14 */
  reasonCode: string;
  reasonDescription?: string;
}

export interface IpsReqAuthDetailPayload {
  /** Transaction ID to query auth status for */
  txnId: string;
  /** API name of the original request */
  orgApi: string;
}

export interface IpsTxnConfirmationPayload {
  /** Original transaction ID being confirmed */
  orgTxnId: string;
  /** Original message ID */
  orgMsgId: string;
  /** Confirmation status */
  status: 'CREDITED' | 'FAILED' | 'PENDING';
  /** Beneficiary name (confirmed) */
  beneficiaryName?: string;
  /** Timestamp of credit to beneficiary account */
  creditTimestamp?: string;
}

export interface IpsReqListPspPayload {
  /** Optional filter by region or type */
  pspType?: 'BANK' | 'WALLET' | 'ALL';
}

export interface IpsReqListKeysPayload {
  /** PSP code to list key types for */
  pspCode?: string;
}

/** Parsed inbound IPS XML message */
export interface IpsXmlParsed {
  apiName: string;
  head: IpsXmlHead;
  txn: Record<string, unknown>;
  signature?: string;
  rawXml: string;
}

/** Parsed IPS ACK response */
export interface IpsAckParsed {
  api: string;
  reqMsgId: string;
  result: 'SUCCESS' | 'FAILURE';
  errorCode?: string;
  errorDescription?: string;
  /** NACK-specific: structured error from Err element (IPS TSD §2.4) */
  nackErrors?: Array<{ code: string; type?: string; message?: string }>;
  rawXml: string;
}

// ---------------------------------------------------------------------------
// XML Building
// ---------------------------------------------------------------------------

function buildHeadXml(head: IpsXmlHead): string {
  const attrs = [
    `ver="${xmlEscape(head.ver)}"`,
    `ts="${xmlEscape(head.ts)}"`,
    `orgId="${xmlEscape(head.orgId)}"`,
    `msgId="${xmlEscape(head.msgId)}"`,
  ];
  if (head.txnId) attrs.push(`txnId="${xmlEscape(head.txnId)}"`);
  if (head.api) attrs.push(`api="${xmlEscape(head.api)}"`);
  return `<Head ${attrs.join(' ')}/>`;
}

function buildPayerPayeeXml(tag: string, pp: IpsPayerPayee): string {
  const parts: string[] = [];
  parts.push(`<Addr>${xmlEscape(pp.addr)}</Addr>`);
  if (pp.name) parts.push(`<Name>${xmlEscape(pp.name)}</Name>`);
  if (pp.sovPrvd) parts.push(`<SoVPrvd>${xmlEscape(pp.sovPrvd)}</SoVPrvd>`);
  if (pp.account) parts.push(`<Account>${xmlEscape(pp.account)}</Account>`);
  if (pp.bic) parts.push(`<Bic>${xmlEscape(pp.bic)}</Bic>`);
  return `<${tag}>${parts.join('')}</${tag}>`;
}

/** Build a ReqPay XML payload */
function buildReqPayTxn(payload: IpsReqPayPayload): string {
  const parts: string[] = [];
  parts.push(`<Type>${xmlEscape(payload.type)}</Type>`);
  if (payload.subType) parts.push(`<SubType>${xmlEscape(payload.subType)}</SubType>`);
  parts.push(buildPayerPayeeXml('Payer', payload.payer));
  parts.push(buildPayerPayeeXml('Payee', payload.payee));
  parts.push(`<Amount Ccy="${xmlEscape(payload.currency)}">${payload.amount.toFixed(2)}</Amount>`);
  if (payload.purposeCode) {
    parts.push(`<PurposeCode>${xmlEscape(payload.purposeCode)}</PurposeCode>`);
  }
  if (payload.initMode) {
    parts.push(`<InitMode>${xmlEscape(payload.initMode)}</InitMode>`);
  }
  if (payload.note) {
    parts.push(`<Note>${xmlEscape(payload.note)}</Note>`);
  }
  if (payload.encryptedPin) {
    parts.push(`<Cred><PIN>${xmlEscape(payload.encryptedPin)}</PIN></Cred>`);
  }
  return `<Txn>${parts.join('')}</Txn>`;
}

/**
 * Build a complete IPS XML request message.
 *
 * @param apiName — e.g. "ReqPay", "ReqValAdd", "ReqRegMapper"
 * @param head — message header fields
 * @param txnXml — pre-built <Txn>...</Txn> inner XML
 * @returns unsigned XML string (signature added separately by signing layer)
 */
export function buildIpsRequestXml(apiName: string, head: IpsXmlHead, txnXml: string): string {
  const headWithApi = { ...head, api: apiName };
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<upi:${xmlEscape(apiName)} xmlns:upi="${IPS_XML_NAMESPACE}">`,
    `  ${buildHeadXml(headWithApi)}`,
    `  ${txnXml}`,
    `</upi:${xmlEscape(apiName)}>`,
  ].join('\n');
}

/**
 * Insert an RSA-SHA256 signature into a built XML message.
 * Called after buildIpsRequestXml, before transmission.
 */
export function insertSignature(xml: string, signatureBase64: string): string {
  const closingTag = xml.lastIndexOf('</upi:');
  if (closingTag === -1) return xml;
  return [
    xml.slice(0, closingTag),
    `  <Signature>${xmlEscape(signatureBase64)}</Signature>\n`,
    xml.slice(closingTag),
  ].join('');
}

/**
 * Build an ACK response XML (sent back to IPS when we receive a callback).
 */
export function buildAckResponseXml(
  apiName: string,
  reqMsgId: string,
  result: 'SUCCESS' | 'FAILURE',
  ts: string,
  orgId: string,
  errorCode?: string
): string {
  const attrs = [
    `api="${xmlEscape(apiName)}"`,
    `reqMsgId="${xmlEscape(reqMsgId)}"`,
    `result="${xmlEscape(result)}"`,
    `ts="${xmlEscape(ts)}"`,
    `orgId="${xmlEscape(orgId)}"`,
  ];
  if (errorCode) attrs.push(`errorCode="${xmlEscape(errorCode)}"`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<upi:Ack xmlns:upi="${IPS_XML_NAMESPACE}" ${attrs.join(' ')}/>`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Convenience builders for specific APIs
// ---------------------------------------------------------------------------

export function buildReqPay(head: IpsXmlHead, payload: IpsReqPayPayload): string {
  return buildIpsRequestXml('ReqPay', head, buildReqPayTxn(payload));
}

export function buildReqValAdd(head: IpsXmlHead, payload: IpsReqValAddPayload): string {
  const txn = `<Txn><Addr>${xmlEscape(payload.addr)}</Addr></Txn>`;
  return buildIpsRequestXml('ReqValAdd', head, txn);
}

export function buildReqChkTxn(head: IpsXmlHead, payload: IpsReqChkTxnPayload): string {
  const txn = [
    '<Txn>',
    `  <OrgTxnId>${xmlEscape(payload.orgTxnId)}</OrgTxnId>`,
    `  <OrgMsgId>${xmlEscape(payload.orgMsgId)}</OrgMsgId>`,
    '</Txn>',
  ].join('\n');
  return buildIpsRequestXml('ReqChkTxn', head, txn);
}

export function buildReqHbt(head: IpsXmlHead, payload: IpsReqHbtPayload): string {
  const txn = `<Txn><OrgId>${xmlEscape(payload.orgId)}</OrgId></Txn>`;
  return buildIpsRequestXml('ReqHbt', head, txn);
}

export function buildReqRegMapper(head: IpsXmlHead, payload: IpsReqRegMapperPayload): string {
  const parts: string[] = [];
  parts.push(`<Operation>${xmlEscape(payload.operation)}</Operation>`);
  parts.push(`<Addr>${xmlEscape(payload.addr)}</Addr>`);
  parts.push(`<EntityType>${xmlEscape(payload.entityType)}</EntityType>`);
  parts.push(`<IdType>${xmlEscape(payload.idType)}</IdType>`);
  parts.push(`<IdValue>${xmlEscape(payload.idValue)}</IdValue>`);
  if (payload.linkedAccountRef) {
    parts.push(`<LinkedAccountRef>${xmlEscape(payload.linkedAccountRef)}</LinkedAccountRef>`);
  }
  if (payload.linkedBankBic) {
    parts.push(`<LinkedBankBic>${xmlEscape(payload.linkedBankBic)}</LinkedBankBic>`);
  }
  return buildIpsRequestXml('ReqRegMapper', head, `<Txn>${parts.join('')}</Txn>`);
}

export function buildReqGetAdd(head: IpsXmlHead, payload: IpsReqGetAddPayload): string {
  const parts: string[] = [];
  parts.push(`<Operation>${xmlEscape(payload.operation)}</Operation>`);
  if (payload.addr) parts.push(`<Addr>${xmlEscape(payload.addr)}</Addr>`);
  if (payload.idType) parts.push(`<IdType>${xmlEscape(payload.idType)}</IdType>`);
  if (payload.idValue) parts.push(`<IdValue>${xmlEscape(payload.idValue)}</IdValue>`);
  return buildIpsRequestXml('ReqGetAdd', head, `<Txn>${parts.join('')}</Txn>`);
}

export function buildReqSetCre(head: IpsXmlHead, payload: IpsReqSetCrePayload): string {
  const parts: string[] = [];
  parts.push(`<Operation>${xmlEscape(payload.operation)}</Operation>`);
  parts.push(`<Cred><NewPIN>${xmlEscape(payload.encryptedNewPin)}</NewPIN>`);
  if (payload.encryptedOldPin) {
    parts.push(`<OldPIN>${xmlEscape(payload.encryptedOldPin)}</OldPIN>`);
  }
  parts.push(`</Cred>`);
  parts.push(`<DeviceId>${xmlEscape(payload.deviceId)}</DeviceId>`);
  return buildIpsRequestXml('ReqSetCre', head, `<Txn>${parts.join('')}</Txn>`);
}

export function buildReqRegMob(head: IpsXmlHead, payload: IpsReqRegMobPayload): string {
  const parts: string[] = [];
  parts.push(`<MobileNumber>${xmlEscape(payload.mobileNumber)}</MobileNumber>`);
  parts.push(`<ProviderCode>${xmlEscape(payload.providerCode)}</ProviderCode>`);
  parts.push(`<AccountRef>${xmlEscape(payload.accountRef)}</AccountRef>`);
  parts.push(`<DeviceId>${xmlEscape(payload.deviceId)}</DeviceId>`);
  if (payload.deviceFingerprint) {
    parts.push(`<DeviceFingerprint>${xmlEscape(payload.deviceFingerprint)}</DeviceFingerprint>`);
  }
  return buildIpsRequestXml('ReqRegMob', head, `<Txn>${parts.join('')}</Txn>`);
}

export function buildReqOtp(head: IpsXmlHead, payload: IpsReqOtpPayload): string {
  const parts: string[] = [];
  parts.push(`<EncryptedOtp>${xmlEscape(payload.encryptedOtp)}</EncryptedOtp>`);
  parts.push(`<TxnId>${xmlEscape(payload.txnId)}</TxnId>`);
  return buildIpsRequestXml('ReqOtp', head, `<Txn>${parts.join('')}</Txn>`);
}

export function buildReqBalEnq(head: IpsXmlHead, payload: IpsReqBalEnqPayload): string {
  const parts: string[] = [];
  parts.push(`<Addr>${xmlEscape(payload.addr)}</Addr>`);
  parts.push(`<SoVPrvd>${xmlEscape(payload.sovPrvd)}</SoVPrvd>`);
  parts.push(`<Account>${xmlEscape(payload.account)}</Account>`);
  return buildIpsRequestXml('ReqBalEnq', head, `<Txn>${parts.join('')}</Txn>`);
}

export function buildReqListAccPvd(head: IpsXmlHead, payload: IpsReqListAccPvdPayload): string {
  const txn = `<Txn><MobileNumber>${xmlEscape(payload.mobileNumber)}</MobileNumber></Txn>`;
  return buildIpsRequestXml('ReqListAccPvd', head, txn);
}

export function buildReqListAccount(head: IpsXmlHead, payload: IpsReqListAccountPayload): string {
  const parts: string[] = [];
  parts.push(`<MobileNumber>${xmlEscape(payload.mobileNumber)}</MobileNumber>`);
  parts.push(`<ProviderCode>${xmlEscape(payload.providerCode)}</ProviderCode>`);
  return buildIpsRequestXml('ReqListAccount', head, `<Txn>${parts.join('')}</Txn>`);
}

// ---------------------------------------------------------------------------
// Phase 4B: New API builders
// ---------------------------------------------------------------------------

/** Build a ReqRev (Reversal) XML payload — IPP FSD §4.14 */
export function buildReqRev(head: IpsXmlHead, payload: IpsReqRevPayload): string {
  const parts: string[] = [];
  parts.push(`<OrgTxnId>${xmlEscape(payload.orgTxnId)}</OrgTxnId>`);
  parts.push(`<OrgMsgId>${xmlEscape(payload.orgMsgId)}</OrgMsgId>`);
  parts.push(`<RevType>${xmlEscape(payload.revType)}</RevType>`);
  if (payload.amount !== undefined) {
    parts.push(
      `<Amount Ccy="${xmlEscape(payload.currency ?? 'NAD')}">${payload.amount.toFixed(2)}</Amount>`
    );
  }
  parts.push(`<ReasonCode>${xmlEscape(payload.reasonCode)}</ReasonCode>`);
  if (payload.reasonDescription) {
    parts.push(`<ReasonDesc>${xmlEscape(payload.reasonDescription)}</ReasonDesc>`);
  }
  return buildIpsRequestXml('ReqRev', head, `<Txn>${parts.join('')}</Txn>`);
}

/** Build a ReqAuthDetail XML payload — IPP FSD §4.5 */
export function buildReqAuthDetail(head: IpsXmlHead, payload: IpsReqAuthDetailPayload): string {
  const parts: string[] = [];
  parts.push(`<TxnId>${xmlEscape(payload.txnId)}</TxnId>`);
  parts.push(`<OrgApi>${xmlEscape(payload.orgApi)}</OrgApi>`);
  return buildIpsRequestXml('ReqAuthDetail', head, `<Txn>${parts.join('')}</Txn>`);
}

/** Build a TxnConfirmation XML payload — IPP FSD §4.16 */
export function buildTxnConfirmation(head: IpsXmlHead, payload: IpsTxnConfirmationPayload): string {
  const parts: string[] = [];
  parts.push(`<OrgTxnId>${xmlEscape(payload.orgTxnId)}</OrgTxnId>`);
  parts.push(`<OrgMsgId>${xmlEscape(payload.orgMsgId)}</OrgMsgId>`);
  parts.push(`<Status>${xmlEscape(payload.status)}</Status>`);
  if (payload.beneficiaryName) {
    parts.push(`<BeneficiaryName>${xmlEscape(payload.beneficiaryName)}</BeneficiaryName>`);
  }
  if (payload.creditTimestamp) {
    parts.push(`<CreditTs>${xmlEscape(payload.creditTimestamp)}</CreditTs>`);
  }
  return buildIpsRequestXml('TxnConfirmation', head, `<Txn>${parts.join('')}</Txn>`);
}

/** Build a ReqListPsp XML payload — IPP FSD §4.9 */
export function buildReqListPsp(head: IpsXmlHead, payload: IpsReqListPspPayload): string {
  const parts: string[] = [];
  if (payload.pspType) {
    parts.push(`<PspType>${xmlEscape(payload.pspType)}</PspType>`);
  }
  return buildIpsRequestXml('ReqListPsp', head, `<Txn>${parts.join('')}</Txn>`);
}

/** Build a ReqListKeys XML payload — IPP FSD §4.10 */
export function buildReqListKeys(head: IpsXmlHead, payload: IpsReqListKeysPayload): string {
  const parts: string[] = [];
  if (payload.pspCode) {
    parts.push(`<PspCode>${xmlEscape(payload.pspCode)}</PspCode>`);
  }
  return buildIpsRequestXml('ReqListKeys', head, `<Txn>${parts.join('')}</Txn>`);
}

// ---------------------------------------------------------------------------
// XML Parsing (for inbound responses — requires fast-xml-parser in "use node")
// ---------------------------------------------------------------------------

/**
 * Parse an inbound IPS XML message (Response or Request callback).
 * Must be called from a "use node" action context.
 */
export function parseIpsXml(rawXml: string): IpsXmlParsed {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { XMLParser } = require('fast-xml-parser');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false,
  });

  const parsed = parser.parse(rawXml);

  // Find the root element (upi:RespPay, upi:ReqMapperConfirmation, etc.)
  const rootKeys = Object.keys(parsed).filter(
    (k) => k.startsWith('upi:') || k.startsWith('Resp') || k.startsWith('Req')
  );
  const rootKey = rootKeys[0];
  if (!rootKey) {
    throw new Error(
      `Cannot identify IPS XML root element. Keys: ${Object.keys(parsed).join(', ')}`
    );
  }

  const root = parsed[rootKey];
  const apiName = rootKey.replace('upi:', '');

  // Extract Head attributes
  const headRaw = root.Head ?? root['@_'] ?? {};
  const headAttrs = typeof headRaw === 'object' ? headRaw : {};

  const head: IpsXmlHead = {
    ver: headAttrs['@_ver'] ?? '2.0',
    ts: headAttrs['@_ts'] ?? '',
    orgId: headAttrs['@_orgId'] ?? '',
    msgId: headAttrs['@_msgId'] ?? '',
    txnId: headAttrs['@_txnId'],
    api: headAttrs['@_api'] ?? apiName,
  };

  // Extract Txn content
  const txn = root.Txn ?? root.Resp ?? {};

  // Extract Signature if present
  const signature = root.Signature;

  return { apiName, head, txn, signature, rawXml };
}

/**
 * Parse an IPS ACK response (received immediately after sending a request).
 */
export function parseIpsAck(rawXml: string): IpsAckParsed {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { XMLParser } = require('fast-xml-parser');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: false,
  });

  const parsed = parser.parse(rawXml);
  const ackKey = Object.keys(parsed).find((k) => k.includes('Ack'));
  if (!ackKey) {
    throw new Error(`Cannot parse IPS ACK. Keys: ${Object.keys(parsed).join(', ')}`);
  }

  const ack = parsed[ackKey];

  // Parse NACK Err elements if present (IPS TSD §2.4)
  let nackErrors: Array<{ code: string; type?: string; message?: string }> | undefined;
  if (ack.Err || ack['upi:Err']) {
    const errElements = ack.Err ?? ack['upi:Err'];
    const errArray = Array.isArray(errElements) ? errElements : [errElements];
    nackErrors = errArray.map((err: any) => ({
      code: err['@_code'] ?? err.Code ?? '',
      type: err['@_type'] ?? err.Type,
      message: err['@_msg'] ?? err['#text'] ?? err.Msg ?? '',
    }));
  }

  return {
    api: ack['@_api'] ?? '',
    reqMsgId: ack['@_reqMsgId'] ?? '',
    result: (ack['@_result'] ?? 'FAILURE') as 'SUCCESS' | 'FAILURE',
    errorCode: ack['@_errorCode'] ?? nackErrors?.[0]?.code,
    errorDescription: ack['@_errorDescription'] ?? nackErrors?.[0]?.message,
    nackErrors,
    rawXml,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate ISO 8601 timestamp for IPS messages */
export function ipsTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate a spec-compliant IPS msgId.
 * Format: 35 digits = 3-digit bank code + 32 hex chars (UUID without hyphens).
 * Per IPS TSD §2.3: msgId must be exactly 35 characters, numeric+hex.
 */
export function generateMsgId(bankCode?: string): string {
  const code = bankCode ?? process.env.IPS_BANK_CODE ?? '099';
  const padded = code.padStart(3, '0').slice(0, 3);
  // Generate 32 hex characters from crypto.randomUUID() or fallback
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${padded}${uuid}`;
}

/** Build a standard IPS XML Head from config + msgId */
export function buildStandardHead(msgId: string, txnId?: string): IpsXmlHead {
  return {
    ver: '2.0',
    ts: ipsTimestamp(),
    orgId: process.env.IPS_ORG_ID ?? 'NAMLEND',
    msgId,
    txnId: txnId ?? msgId,
  };
}
