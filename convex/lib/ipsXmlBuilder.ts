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
    `<upi:${xmlEscape(apiName)} xmlns:upi="http://www.ips.bon.na/upi/schema/">`,
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
    `<upi:Ack xmlns:upi="http://www.ips.bon.na/upi/schema/" ${attrs.join(' ')}/>`,
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

  return {
    api: ack['@_api'] ?? '',
    reqMsgId: ack['@_reqMsgId'] ?? '',
    result: (ack['@_result'] ?? 'FAILURE') as 'SUCCESS' | 'FAILURE',
    errorCode: ack['@_errorCode'],
    errorDescription: ack['@_errorDescription'],
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
