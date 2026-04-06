/**
 * IPS XML Builder — constructs and parses IPS XML messages for the supported
 * NamLend IPP flows.
 *
 * The IPS wire contract is not a single "Head + Txn-only" envelope. Each API
 * has its own required top-level elements, so the helpers below emit
 * spec-shaped request documents for the APIs this product claims to support.
 */

import { xmlEscape } from './xmlEscape';

const IPS_XML_NAMESPACE = process.env.IPS_XML_NAMESPACE ?? 'http://npci.org/upi/schema/';
const IPS_PRODUCT_TYPE = process.env.IPS_PRODUCT_TYPE ?? 'UPI';
const IPS_DEFAULT_ORG_ID =
  process.env.IPS_ORG_ID ??
  process.env.IPS_PARTICIPANT_ORG_ID ??
  process.env.IPS_BANK_CODE ??
  '700001';
const IPS_REFERENCE_URL = process.env.IPS_REFERENCE_URL ?? 'https://namlend.na/ipp';
const IPS_VALIDATION_PAYER_ADDR =
  process.env.IPS_VALIDATION_PAYER_ADDR ?? process.env.IPS_COLLECTIONS_VPA ?? 'collections@namlend';

export interface IpsXmlHead {
  ver: string;
  ts: string;
  orgId: string;
  msgId: string;
  prodType: string;
  destinationOrgId?: string;
  callbackEndpointIP?: string;
  pageSize?: string;
  pageSeqNum?: string;
  pageRecStart?: string;
  pageRecEnd?: string;
  pageTotal?: string;
  txnId?: string;
  api?: string;
}

export interface IpsXmlAmount {
  value: number;
  curr?: string;
}

export interface IpsXmlCredential {
  type: string;
  subType: string;
  data: string;
  code?: string;
  ki?: string;
}

export interface IpsXmlAccount {
  addrType?: 'ACCOUNT' | 'AADHAAR' | 'MOBILE' | 'CARD';
  ifsc?: string;
  actype?: string;
  acnum?: string;
  mmid?: string;
  iin?: string;
  cardDigits?: string;
}

export interface IpsXmlConsent {
  name: string;
  value: string;
  prevVpa?: string;
}

export interface IpsXmlRegId {
  name: 'MOBILE' | 'NUMERICID';
  value: string;
  setStatus?: string;
}

export interface IpsPayerPayee {
  addr: string;
  name?: string;
  seqNum?: string;
  type?: 'PERSON' | 'ENTITY';
  code?: string;
  cmId?: string;
  aadhaarConsent?: 'Y' | 'N';
  device?: Record<string, string | undefined>;
  account?: IpsXmlAccount;
  credentials?: IpsXmlCredential[];
  newCredentials?: IpsXmlCredential[];
  amount?: IpsXmlAmount;
  consent?: IpsXmlConsent;
  regIds?: IpsXmlRegId[];
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
  customerRef?: string;
  refId?: string;
  refUrl?: string;
  requestStartTs?: string;
  requestEndTs?: string;
}

export interface IpsReqValAddPayload {
  addr: string;
  payerAddr?: string;
  payerName?: string;
  mobileNumber?: string;
}

export interface IpsReqChkTxnPayload {
  orgTxnId: string;
  orgMsgId: string;
  orgTxnDate?: string;
  subType?: string;
  initiationMode?: string;
  purposeCode?: string;
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
  linkedAccountType?: string;
  payerName?: string;
  mobileNumber?: string;
  deviceId?: string;
  previousAddr?: string;
}

export interface IpsReqGetAddPayload {
  operation: 'CHECK' | 'FETCH' | 'PORT';
  addr?: string;
  idType?: 'MOBILE' | 'NUMERICID';
  idValue?: string;
  payerAddr?: string;
  payerName?: string;
  mobileNumber?: string;
  deviceId?: string;
}

export interface IpsReqSetCrePayload {
  operation: 'SET' | 'CHANGE' | 'RESET';
  encryptedNewPin: string;
  encryptedOldPin?: string;
  deviceId: string;
  addr?: string;
  payerName?: string;
  mobileNumber?: string;
  accountRef?: string;
  accountIfsc?: string;
  accountType?: string;
}

export interface IpsReqRegMobPayload {
  mobileNumber: string;
  providerCode: string;
  accountRef: string;
  deviceId: string;
  deviceFingerprint?: string;
  addr?: string;
  payerName?: string;
  accountType?: string;
  cardDigits?: string;
  expiryDate?: string;
  credentials?: IpsXmlCredential[];
  regDetailsType?: string;
}

export interface IpsReqOtpPayload {
  encryptedOtp: string;
  txnId: string;
  payerAddr?: string;
  mobileNumber?: string;
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
  payerAddr?: string;
  payerName?: string;
  deviceId?: string;
}

export interface IpsReqRevPayload {
  orgTxnId: string;
  orgMsgId: string;
  revType: 'FULL' | 'PARTIAL';
  amount?: number;
  currency?: string;
  reasonCode: string;
  reasonDescription?: string;
}

export interface IpsReqAuthDetailPayload {
  txnId: string;
  orgApi: string;
}

export interface IpsTxnConfirmationPayload {
  orgTxnId: string;
  orgMsgId: string;
  status: 'CREDITED' | 'FAILED' | 'PENDING';
  beneficiaryName?: string;
  creditTimestamp?: string;
}

export interface IpsReqListPspPayload {
  pspType?: 'BANK' | 'WALLET' | 'ALL';
}

export interface IpsReqListKeysPayload {
  pspCode?: string;
}

export interface IpsXmlParsed {
  apiName: string;
  head: IpsXmlHead;
  txn: Record<string, unknown>;
  resp?: Record<string, unknown>;
  payer?: Record<string, unknown>;
  payee?: Record<string, unknown>;
  payees?: unknown;
  signature?: string;
  body: Record<string, unknown>;
  rawXml: string;
}

export interface IpsAckParsed {
  api: string;
  reqMsgId: string;
  result: 'SUCCESS' | 'FAILURE';
  errorCode?: string;
  errorDescription?: string;
  nackErrors?: Array<{ code: string; type?: string; message?: string }>;
  rawXml: string;
}

function buildAttributes(attrs: Record<string, unknown>): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => ` ${name}="${xmlEscape(String(value))}"`)
    .join('');
}

function buildSelfClosingTag(tag: string, attrs: Record<string, unknown>): string {
  return `<${tag}${buildAttributes(attrs)} />`;
}

function wrapXml(tag: string, content = '', attrs?: Record<string, unknown>): string {
  return `<${tag}${attrs ? buildAttributes(attrs) : ''}>${content}</${tag}>`;
}

function buildHeadXml(head: IpsXmlHead): string {
  return buildSelfClosingTag('Head', {
    ver: head.ver,
    ts: head.ts,
    orgId: head.orgId,
    msgId: head.msgId,
    prodType: head.prodType,
    destinationOrgId: head.destinationOrgId,
    callbackEndpointIP: head.callbackEndpointIP,
    pageSize: head.pageSize,
    pageSeqNum: head.pageSeqNum,
    pageRecStart: head.pageRecStart,
    pageRecEnd: head.pageRecEnd,
    pageTotal: head.pageTotal,
  });
}

function buildDefaultDevice(
  mobileNumber?: string,
  deviceId?: string,
  overrides?: Record<string, string | undefined>
): Record<string, string | undefined> {
  return {
    MOBILE: mobileNumber,
    TYPE: 'MOB',
    ID: deviceId ?? 'WEB-CLIENT',
    OS: 'web',
    APP: 'namlend-trust-portal',
    CAPABILITY: '1000',
    ...overrides,
  };
}

function buildDeviceXml(device?: Record<string, string | undefined>): string {
  if (!device) return '';

  const tags = Object.entries(device)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => buildSelfClosingTag('Tag', { name, value }));

  return tags.length ? wrapXml('Device', tags.join('')) : '';
}

function buildAccountXml(account?: IpsXmlAccount): string {
  if (!account) return '';

  const details = [
    account.ifsc ? buildSelfClosingTag('Detail', { name: 'IFSC', value: account.ifsc }) : '',
    account.actype ? buildSelfClosingTag('Detail', { name: 'ACTYPE', value: account.actype }) : '',
    account.acnum ? buildSelfClosingTag('Detail', { name: 'ACNUM', value: account.acnum }) : '',
    account.mmid ? buildSelfClosingTag('Detail', { name: 'MMID', value: account.mmid }) : '',
    account.iin ? buildSelfClosingTag('Detail', { name: 'IIN', value: account.iin }) : '',
    account.cardDigits
      ? buildSelfClosingTag('Detail', { name: 'CARDDIGITS', value: account.cardDigits })
      : '',
  ].filter(Boolean);

  if (!details.length) return '';

  return wrapXml('Ac', details.join(''), {
    addrType: account.addrType ?? 'ACCOUNT',
  });
}

function buildCredsXml(tag: 'Creds' | 'NewCred', creds?: IpsXmlCredential[]): string {
  if (!creds?.length) return '';

  const credXml = creds
    .map((cred) =>
      wrapXml(
        'Cred',
        wrapXml('Data', xmlEscape(cred.data), {
          code: cred.code ?? 'NPCI',
          ki: cred.ki ?? process.env.IPS_KEY_ID ?? '20250822',
        }),
        {
          type: cred.type,
          subType: cred.subType,
        }
      )
    )
    .join('');

  return wrapXml(tag, credXml);
}

function buildAmountXml(amount?: IpsXmlAmount): string {
  if (!amount) return '';
  return buildSelfClosingTag('Amount', {
    value: amount.value.toFixed(2),
    curr: amount.curr ?? 'NAD',
  });
}

function buildConsentXml(consent?: IpsXmlConsent): string {
  if (!consent) return '';
  return buildSelfClosingTag('Consent', consent);
}

function buildRegIdDetailsXml(regIds?: IpsXmlRegId[]): string {
  if (!regIds?.length) return '';

  return wrapXml(
    'RegIdDetails',
    regIds
      .map((regId) =>
        wrapXml('Id', '', {
          name: regId.name,
          value: regId.value,
          setStatus: regId.setStatus,
        })
      )
      .join('')
  );
}

function buildPayerPayeeXml(tag: 'Payer' | 'Payee', participant: IpsPayerPayee): string {
  const children = [
    buildDeviceXml(participant.device),
    buildAccountXml(participant.account),
    buildCredsXml('Creds', participant.credentials),
    buildAmountXml(participant.amount),
    buildCredsXml('NewCred', participant.newCredentials),
    buildConsentXml(participant.consent),
    buildRegIdDetailsXml(participant.regIds),
  ]
    .filter(Boolean)
    .join('');

  return wrapXml(tag, children, {
    addr: participant.addr,
    name: participant.name,
    seqNum: participant.seqNum ?? '1',
    type: participant.type ?? 'PERSON',
    code: participant.code ?? '0000',
    cmId: participant.cmId,
    aadhaarConsent: participant.aadhaarConsent,
  });
}

function buildTxnXml(attrs: Record<string, unknown>, children: string[] = []): string {
  return wrapXml('Txn', children.filter(Boolean).join(''), attrs);
}

function buildMetaXml(tags: Array<{ name: string; value: string }>): string {
  return wrapXml('Meta', tags.map((tag) => buildSelfClosingTag('Tag', tag)).join(''));
}

function buildPayeesXml(payees: IpsPayerPayee[]): string {
  return wrapXml('Payees', payees.map((payee) => buildPayerPayeeXml('Payee', payee)).join(''));
}

function buildPayersXml(payers: IpsPayerPayee[]): string {
  return wrapXml('Payers', payers.map((payer) => buildPayerPayeeXml('Payer', payer)).join(''));
}

function buildRegDetailsXml(
  type: string | undefined,
  details: Array<{ name: string; value: string }>,
  credentials: IpsXmlCredential[]
): string {
  return wrapXml(
    'RegDetails',
    [
      ...details.map((detail) => buildSelfClosingTag('Detail', detail)),
      buildCredsXml('Creds', credentials),
    ]
      .filter(Boolean)
      .join(''),
    { type }
  );
}

function buildIpsRequestXml(apiName: string, head: IpsXmlHead, sections: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<upi:${xmlEscape(apiName)} xmlns:upi="${IPS_XML_NAMESPACE}">`,
    `  ${buildHeadXml({ ...head, api: apiName })}`,
    ...sections.filter(Boolean).map((section) => `  ${section}`),
    `</upi:${xmlEscape(apiName)}>`,
  ].join('\n');
}

export function insertSignature(xml: string, signatureBase64: string): string {
  const closingTag = xml.lastIndexOf('</upi:');
  if (closingTag === -1) return xml;
  return [
    xml.slice(0, closingTag),
    `  <Signature>${xmlEscape(signatureBase64)}</Signature>\n`,
    xml.slice(closingTag),
  ].join('');
}

export function buildAckResponseXml(
  apiName: string,
  reqMsgId: string,
  result: 'SUCCESS' | 'FAILURE',
  ts: string,
  orgId: string,
  errorCode?: string
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<upi:Ack xmlns:upi="${IPS_XML_NAMESPACE}"${buildAttributes({
      api: apiName,
      reqMsgId,
      result,
      ts,
      orgId,
      errorCode,
    })}/>`,
  ].join('\n');
}

export function buildReqPay(head: IpsXmlHead, payload: IpsReqPayPayload): string {
  const amount = {
    value: payload.amount,
    curr: payload.currency,
  };
  const payer: IpsPayerPayee = {
    ...payload.payer,
    amount,
    credentials:
      payload.encryptedPin && !payload.payer.credentials?.length
        ? [{ type: 'PIN', subType: 'MPIN', data: payload.encryptedPin }]
        : payload.payer.credentials,
  };
  const payee: IpsPayerPayee = {
    ...payload.payee,
    amount,
  };

  return buildIpsRequestXml('ReqPay', head, [
    buildMetaXml([
      { name: 'PAYREQSTART', value: payload.requestStartTs ?? head.ts },
      { name: 'PAYREQEND', value: payload.requestEndTs ?? head.ts },
    ]),
    buildTxnXml(
      {
        id: head.txnId ?? head.msgId,
        note: payload.note ?? 'Payment',
        refId: payload.refId ?? head.msgId,
        refUrl: payload.refUrl ?? IPS_REFERENCE_URL,
        ts: head.ts,
        type: payload.type,
        custRef: payload.customerRef ?? head.msgId,
        initiationMode: payload.initMode ?? '00',
        purpose: payload.purposeCode ?? '00',
        subType: payload.subType,
      },
      []
    ),
    buildPayerPayeeXml('Payer', payer),
    buildPayersXml([payer]),
    buildPayeesXml([payee]),
  ]);
}

export function buildReqValAdd(head: IpsXmlHead, payload: IpsReqValAddPayload): string {
  return buildIpsRequestXml('ReqValAdd', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'Validate address',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'ValAdd',
      custRef: head.msgId,
    }),
    buildPayerPayeeXml('Payer', {
      addr: payload.payerAddr ?? IPS_VALIDATION_PAYER_ADDR,
      name: payload.payerName ?? 'NamLend Validation',
      device: buildDefaultDevice(payload.mobileNumber),
    }),
    buildPayerPayeeXml('Payee', {
      addr: payload.addr,
      seqNum: '1',
    }),
  ]);
}

export function buildReqChkTxn(head: IpsXmlHead, payload: IpsReqChkTxnPayload): string {
  return buildIpsRequestXml('ReqChkTxn', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'Check Txn Status',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'ChkTxn',
      orgMsgId: payload.orgMsgId,
      orgTxnId: payload.orgTxnId,
      orgTxnDate: payload.orgTxnDate,
      custRef: head.msgId,
      initiationMode: payload.initiationMode ?? '00',
      subType: payload.subType ?? 'PAY',
      purpose: payload.purposeCode ?? '00',
    }),
  ]);
}

export function buildReqHbt(head: IpsXmlHead, payload: IpsReqHbtPayload): string {
  return buildIpsRequestXml('ReqHbt', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'Heartbeat',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'Hbt',
      custRef: payload.orgId,
    }),
  ]);
}

export function buildReqRegMapper(head: IpsXmlHead, payload: IpsReqRegMapperPayload): string {
  return buildIpsRequestXml('ReqRegMapper', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'Mapper',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'CMREGISTRATION',
      custRef: head.msgId,
      op: payload.operation,
    }),
    buildPayerPayeeXml('Payer', {
      addr: payload.addr,
      name: payload.payerName ?? payload.addr.split('@')[0],
      type: payload.entityType,
      device: buildDefaultDevice(
        payload.mobileNumber ?? (payload.idType === 'MOBILE' ? payload.idValue : undefined),
        payload.deviceId
      ),
      account:
        payload.linkedAccountRef || payload.linkedBankBic
          ? {
              ifsc: payload.linkedBankBic,
              actype: payload.linkedAccountType ?? 'SAVINGS',
              acnum: payload.linkedAccountRef,
            }
          : undefined,
      consent: {
        name: 'CMREGISTRATION',
        value: 'Y',
        prevVpa: payload.previousAddr,
      },
      regIds: [
        {
          name: payload.idType,
          value: payload.idValue,
          setStatus: 'ACTIVE',
        },
      ],
    }),
  ]);
}

export function buildReqGetAdd(head: IpsXmlHead, payload: IpsReqGetAddPayload): string {
  const subType = payload.operation === 'FETCH' ? (payload.addr ? 'VPA' : 'ID') : undefined;
  return buildIpsRequestXml('ReqGetAdd', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'Mapper',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: payload.operation,
      subType,
      custRef: head.msgId,
    }),
    buildPayerPayeeXml('Payer', {
      addr: payload.payerAddr ?? payload.addr ?? IPS_VALIDATION_PAYER_ADDR,
      name: payload.payerName ?? 'NamLend User',
      device: buildDefaultDevice(
        payload.mobileNumber ?? (payload.idType === 'MOBILE' ? payload.idValue : undefined),
        payload.deviceId
      ),
      consent: {
        name: 'CMREGISTRATION',
        value: 'Y',
      },
      regIds:
        payload.idType && payload.idValue
          ? [
              {
                name: payload.idType,
                value: payload.idValue,
              },
            ]
          : undefined,
    }),
  ]);
}

export function buildReqSetCre(head: IpsXmlHead, payload: IpsReqSetCrePayload): string {
  return buildIpsRequestXml('ReqSetCre', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'set credential',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'SetCre',
    }),
    buildPayerPayeeXml('Payer', {
      addr: payload.addr ?? IPS_VALIDATION_PAYER_ADDR,
      name: payload.payerName ?? 'NamLend User',
      device: buildDefaultDevice(payload.mobileNumber, payload.deviceId),
      account:
        payload.accountRef || payload.accountIfsc
          ? {
              ifsc: payload.accountIfsc,
              actype: payload.accountType ?? 'SAVINGS',
              acnum: payload.accountRef,
            }
          : undefined,
      credentials: payload.encryptedOldPin
        ? [{ type: 'PIN', subType: 'MPIN', data: payload.encryptedOldPin }]
        : undefined,
      newCredentials: [{ type: 'PIN', subType: 'MPIN', data: payload.encryptedNewPin }],
    }),
  ]);
}

export function buildReqRegMob(head: IpsXmlHead, payload: IpsReqRegMobPayload): string {
  const credentials =
    payload.credentials && payload.credentials.length
      ? payload.credentials
      : [
          {
            type: 'OTP',
            subType: 'SMS',
            data: payload.deviceFingerprint ?? payload.deviceId,
          },
        ];

  const regDetailsType =
    payload.regDetailsType ??
    (payload.cardDigits
      ? 'FORMAT2'
      : payload.accountType?.toUpperCase().includes('WALLET')
        ? 'FORMAT7'
        : 'FORMAT6');

  return buildIpsRequestXml('ReqRegMob', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'Mobile registration',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'ReqRegMob',
    }),
    buildPayerPayeeXml('Payer', {
      addr: payload.addr ?? `${payload.mobileNumber}@${payload.providerCode.toLowerCase()}`,
      name: payload.payerName ?? payload.mobileNumber,
      device: buildDefaultDevice(payload.mobileNumber, payload.deviceId, {
        CAPABILITY: payload.deviceFingerprint ?? '5200000200010004000639292929292',
      }),
      account: {
        ifsc: payload.providerCode,
        actype: payload.accountType ?? 'SAVINGS',
        acnum: payload.accountRef,
      },
    }),
    buildRegDetailsXml(
      regDetailsType,
      [
        { name: 'MOBILE', value: payload.mobileNumber },
        ...(payload.cardDigits ? [{ name: 'CARDDIGITS', value: payload.cardDigits }] : []),
        ...(payload.expiryDate ? [{ name: 'EXPDATE', value: payload.expiryDate }] : []),
      ],
      credentials
    ),
  ]);
}

export function buildReqOtp(head: IpsXmlHead, payload: IpsReqOtpPayload): string {
  return buildIpsRequestXml('ReqOtp', head, [
    buildTxnXml({
      id: payload.txnId,
      note: 'Otp Req',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'Otp',
    }),
    buildPayerPayeeXml('Payer', {
      addr: payload.payerAddr ?? IPS_VALIDATION_PAYER_ADDR,
      device: buildDefaultDevice(payload.mobileNumber),
      credentials: [{ type: 'OTP', subType: 'SMS', data: payload.encryptedOtp }],
    }),
  ]);
}

export function buildReqBalEnq(head: IpsXmlHead, payload: IpsReqBalEnqPayload): string {
  return buildIpsRequestXml('ReqBalEnq', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'Balance Enquiry',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'BalEnq',
      custRef: head.msgId,
    }),
    buildPayerPayeeXml('Payer', {
      addr: payload.addr,
      account: {
        ifsc: payload.sovPrvd,
        acnum: payload.account,
        actype: 'SAVINGS',
      },
    }),
  ]);
}

export function buildReqListAccPvd(head: IpsXmlHead, payload: IpsReqListAccPvdPayload): string {
  return buildIpsRequestXml('ReqListAccPvd', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'List Account Providers',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'ListAccPvd',
      custRef: payload.mobileNumber,
    }),
  ]);
}

export function buildReqListAccount(head: IpsXmlHead, payload: IpsReqListAccountPayload): string {
  return buildIpsRequestXml('ReqListAccount', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'List Accounts',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'ListAccount',
    }),
    buildPayerPayeeXml('Payer', {
      addr: payload.payerAddr ?? `${payload.mobileNumber}@namlend`,
      name: payload.payerName ?? payload.mobileNumber,
      aadhaarConsent: 'N',
      device: buildDefaultDevice(payload.mobileNumber, payload.deviceId),
      account: {
        ifsc: payload.providerCode,
      },
    }),
    buildSelfClosingTag('Link', {
      type: 'MOBILE',
      value: payload.mobileNumber,
    }),
  ]);
}

export function buildReqRev(head: IpsXmlHead, payload: IpsReqRevPayload): string {
  return buildIpsRequestXml('ReqRev', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: payload.reasonDescription ?? 'Reversal',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'REVERSAL',
      orgTxnId: payload.orgTxnId,
      orgMsgId: payload.orgMsgId,
      subType: payload.revType,
    }),
  ]);
}

export function buildReqAuthDetail(head: IpsXmlHead, payload: IpsReqAuthDetailPayload): string {
  return buildIpsRequestXml('ReqAuthDetail', head, [
    buildTxnXml({
      id: payload.txnId,
      note: 'Auth detail',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: payload.orgApi,
    }),
  ]);
}

export function buildTxnConfirmation(head: IpsXmlHead, payload: IpsTxnConfirmationPayload): string {
  return buildIpsRequestXml('TxnConfirmation', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'Txn confirmation',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'TxnConfirmation',
      orgTxnId: payload.orgTxnId,
      orgMsgId: payload.orgMsgId,
    }),
    wrapXml('TxnConfirmation', '', {
      note: payload.beneficiaryName ?? 'Txn confirmation',
      orgStatus:
        payload.status === 'CREDITED'
          ? 'SUCCESS'
          : payload.status === 'FAILED'
            ? 'FAILURE'
            : 'PENDING',
      type: 'PAY',
    }),
  ]);
}

export function buildReqListPsp(head: IpsXmlHead, payload: IpsReqListPspPayload): string {
  return buildIpsRequestXml('ReqListPsp', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'List PSPs',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'ListPsp',
      custRef: payload.pspType,
    }),
  ]);
}

export function buildReqListKeys(head: IpsXmlHead, payload: IpsReqListKeysPayload): string {
  return buildIpsRequestXml('ReqListKeys', head, [
    buildTxnXml({
      id: head.txnId ?? head.msgId,
      note: 'List keys',
      refId: head.msgId,
      refUrl: IPS_REFERENCE_URL,
      ts: head.ts,
      type: 'ListKeys',
      custRef: payload.pspCode,
    }),
  ]);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

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
  const rootKey = Object.keys(parsed).find(
    (key) => key.startsWith('upi:') || /^Req|^Resp/.test(key)
  );
  if (!rootKey) {
    throw new Error(
      `Cannot identify IPS XML root element. Keys: ${Object.keys(parsed).join(', ')}`
    );
  }

  const root = toRecord(parsed[rootKey]);
  const apiName = rootKey.replace('upi:', '');
  const headRaw = toRecord(root.Head);

  const head: IpsXmlHead = {
    ver: String(headRaw['@_ver'] ?? '2.0'),
    ts: String(headRaw['@_ts'] ?? ''),
    orgId: String(headRaw['@_orgId'] ?? ''),
    msgId: String(headRaw['@_msgId'] ?? ''),
    prodType: String(headRaw['@_prodType'] ?? IPS_PRODUCT_TYPE),
    destinationOrgId: headRaw['@_destinationOrgId'] as string | undefined,
    callbackEndpointIP: headRaw['@_callbackEndpointIP'] as string | undefined,
    pageSize: headRaw['@_pageSize'] as string | undefined,
    pageSeqNum: headRaw['@_pageSeqNum'] as string | undefined,
    pageRecStart: headRaw['@_pageRecStart'] as string | undefined,
    pageRecEnd: headRaw['@_pageRecEnd'] as string | undefined,
    pageTotal: headRaw['@_pageTotal'] as string | undefined,
    api: apiName,
  };

  return {
    apiName,
    head,
    txn: toRecord(root.Txn),
    resp: root.Resp ? toRecord(root.Resp) : undefined,
    payer: root.Payer ? toRecord(root.Payer) : undefined,
    payee: root.Payee ? toRecord(root.Payee) : undefined,
    payees: root.Payees,
    signature: typeof root.Signature === 'string' ? root.Signature : undefined,
    body: root,
    rawXml,
  };
}

export function parseIpsAck(rawXml: string): IpsAckParsed {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { XMLParser } = require('fast-xml-parser');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: false,
  });

  const parsed = parser.parse(rawXml);
  const ackKey = Object.keys(parsed).find((key) => key.includes('Ack'));
  if (!ackKey) {
    throw new Error(`Cannot parse IPS ACK. Keys: ${Object.keys(parsed).join(', ')}`);
  }

  const ack = toRecord(parsed[ackKey]);
  const errElements = ack.Err ?? ack['upi:Err'];
  const nackErrors = errElements
    ? (Array.isArray(errElements) ? errElements : [errElements]).map((err: any) => ({
        code: err['@_code'] ?? err.Code ?? '',
        type: err['@_type'] ?? err.Type,
        message: err['@_msg'] ?? err['#text'] ?? err.Msg ?? '',
      }))
    : undefined;

  return {
    api: String(ack['@_api'] ?? ''),
    reqMsgId: String(ack['@_reqMsgId'] ?? ''),
    result: (ack['@_result'] ?? 'FAILURE') as 'SUCCESS' | 'FAILURE',
    errorCode: (ack['@_errorCode'] as string | undefined) ?? nackErrors?.[0]?.code,
    errorDescription: (ack['@_errorDescription'] as string | undefined) ?? nackErrors?.[0]?.message,
    nackErrors,
    rawXml,
  };
}

export function ipsTimestamp(): string {
  return new Date().toISOString();
}

export function generateMsgId(bankCode?: string): string {
  const code = bankCode ?? process.env.IPS_BANK_CODE ?? '099';
  const padded = code.padStart(3, '0').slice(0, 3);
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${padded}${uuid}`;
}

export function buildStandardHead(msgId: string, txnId?: string): IpsXmlHead {
  return {
    ver: '2.0',
    ts: ipsTimestamp(),
    orgId: IPS_DEFAULT_ORG_ID,
    msgId,
    prodType: IPS_PRODUCT_TYPE,
    txnId: txnId ?? msgId,
  };
}
