import { describe, expect, it } from 'vitest';
import {
  buildReqAuthDetail,
  buildReqChkTxn,
  buildReqGetAdd,
  buildReqListAccPvd,
  buildReqListAccount,
  buildReqListKeys,
  buildReqListPsp,
  buildReqPay,
  buildReqRegMapper,
  buildReqRegMob,
  buildReqRev,
  buildReqSetCre,
  buildReqValAdd,
  buildStandardHead,
  buildTxnConfirmation,
  generateMsgId,
  parseIpsXml,
} from '../../convex/lib/ipsXmlBuilder';

describe('ipsXmlBuilder', () => {
  it('builds a spec-complete head with prodType and non-placeholder orgId', () => {
    const head = buildStandardHead('MSG-123');

    expect(head.msgId).toBe('MSG-123');
    expect(head.prodType).toBeTruthy();
    expect(head.orgId).toBeTruthy();
    expect(head.orgId).not.toBe('NAMLEND');
  });

  it('generates unpredictable, bank-prefixed message identifiers', () => {
    const first = generateMsgId('7');
    const second = generateMsgId('7');

    expect(first).toMatch(/^007[a-f0-9]{32}$/);
    expect(second).toMatch(/^007[a-f0-9]{32}$/);
    expect(second).not.toBe(first);
  });

  it('emits supported request shapes with their required top-level sections', () => {
    const head = buildStandardHead('MSG-REQ');

    const cases = [
      {
        xml: buildReqPay(head, {
          type: 'PAY',
          payer: { addr: 'payer@namlend' },
          payee: { addr: 'payee@fnb' },
          amount: 125.5,
          currency: 'NAD',
        }),
        expected: ['<upi:ReqPay', 'prodType=', '<Txn', '<Payer', '<Payees>'],
      },
      {
        xml: buildReqValAdd(head, {
          addr: 'payee@fnb',
        }),
        expected: ['<upi:ReqValAdd', '<Payer', '<Payee'],
      },
      {
        xml: buildReqChkTxn(head, {
          orgTxnId: 'ORG-TXN-1',
          orgMsgId: 'ORG-MSG-1',
        }),
        expected: ['<upi:ReqChkTxn', 'orgTxnId="ORG-TXN-1"', 'orgMsgId="ORG-MSG-1"'],
      },
      {
        xml: buildReqRegMob(head, {
          mobileNumber: '0811234567',
          providerCode: 'FIRNNANX',
          accountRef: '1234567890',
          deviceId: 'WEB-DEVICE',
        }),
        expected: ['<upi:ReqRegMob', '<RegDetails', '<Device>', '<Ac'],
      },
      {
        xml: buildReqListAccPvd(head, {
          mobileNumber: '0811234567',
        }),
        expected: ['<upi:ReqListAccPvd', 'custRef="0811234567"'],
      },
      {
        xml: buildReqListAccount(head, {
          mobileNumber: '0811234567',
          providerCode: 'FIRNNANX',
        }),
        expected: ['<upi:ReqListAccount', '<Payer', '<Link type="MOBILE" value="0811234567" />'],
      },
      {
        xml: buildReqSetCre(head, {
          operation: 'SET',
          encryptedNewPin: '123456',
          deviceId: 'WEB-DEVICE',
        }),
        expected: ['<upi:ReqSetCre', '<NewCred>', '<Data'],
      },
      {
        xml: buildReqGetAdd(head, {
          operation: 'FETCH',
          addr: 'payee@fnb',
        }),
        expected: ['<upi:ReqGetAdd', 'type="FETCH"', '<Payer'],
      },
      {
        xml: buildReqRegMapper(head, {
          operation: 'ADD',
          addr: 'payer@namlend',
          entityType: 'PERSON',
          idType: 'MOBILE',
          idValue: '0811234567',
        }),
        expected: ['<upi:ReqRegMapper', '<Consent', '<RegIdDetails>'],
      },
      {
        xml: buildReqRev(head, {
          orgTxnId: 'ORG-TXN-1',
          orgMsgId: 'ORG-MSG-1',
          revType: 'FULL',
          reasonCode: 'RRC',
          reasonDescription: 'Refund required',
        }),
        expected: ['<upi:ReqRev', 'orgTxnId="ORG-TXN-1"', 'subType="FULL"'],
      },
      {
        xml: buildReqAuthDetail(head, {
          txnId: 'TXN-AUTH-1',
          orgApi: 'ReqPay',
        }),
        expected: ['<upi:ReqAuthDetail', 'id="TXN-AUTH-1"', 'type="ReqPay"'],
      },
      {
        xml: buildTxnConfirmation(head, {
          orgTxnId: 'ORG-TXN-1',
          orgMsgId: 'ORG-MSG-1',
          status: 'CREDITED',
          beneficiaryName: 'NamLend Trust',
        }),
        expected: ['<upi:TxnConfirmation', 'orgTxnId="ORG-TXN-1"', 'orgStatus="SUCCESS"'],
      },
      {
        xml: buildReqListPsp(head, {
          pspType: 'ALL',
        }),
        expected: ['<upi:ReqListPsp', 'type="ListPsp"', 'custRef="ALL"'],
      },
      {
        xml: buildReqListKeys(head, {
          pspCode: 'FIRNNANX',
        }),
        expected: ['<upi:ReqListKeys', 'type="ListKeys"', 'custRef="FIRNNANX"'],
      },
    ];

    for (const testCase of cases) {
      for (const fragment of testCase.expected) {
        expect(testCase.xml).toContain(fragment);
      }
    }
  });

  it('parses RespValAdd response fields used by the UI', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<upi:RespValAdd xmlns:upi="http://npci.org/upi/schema/">
  <Head ver="2.0" ts="2026-04-05T09:00:00+02:00" orgId="NPCI" msgId="RESP-1" prodType="UPI"/>
  <Resp reqMsgId="REQ-1" result="SUCCESS" errCode="" maskName="Jane User" code="0000" type="PERSON" IFSC="FIRNNANX" IIN="500001" accType="SAVINGS" addr="jane@fnb"/>
  <Txn id="TXN-1" note="Validate vpa" refId="REF-1" refUrl="https://namlend.na/ipp" ts="2026-04-05T09:00:00+02:00" type="ValAdd" custRef="REQ-1"/>
</upi:RespValAdd>`;

    const parsed = parseIpsXml(xml);

    expect(parsed.apiName).toBe('RespValAdd');
    expect(parsed.resp?.['@_result']).toBe('SUCCESS');
    expect(parsed.resp?.['@_maskName']).toBe('Jane User');
    expect(parsed.resp?.['@_IFSC']).toBe('FIRNNANX');
    expect(parsed.resp?.['@_addr']).toBe('jane@fnb');
  });
});
