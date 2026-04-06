import { describe, expect, it } from 'vitest';
import {
  getAliasAvailabilityReason,
  isAliasUsable,
  parseRespChkTxnDetails,
  parseRespGetAddDetails,
} from '../../convex/lib/ipsResponseParsers';

describe('ipsResponseParsers', () => {
  it('treats only ACTIVE + synced aliases as usable', () => {
    expect(isAliasUsable('ACTIVE', true)).toBe(true);
    expect(isAliasUsable('ACTIVE', false)).toBe(false);
    expect(isAliasUsable('NEW', true)).toBe(false);
    expect(getAliasAvailabilityReason('ACTIVE', false)).toContain('awaiting IPS confirmation');
    expect(getAliasAvailabilityReason('INACTIVE', true)).toContain('inactive');
  });

  it('parses RespChkTxn details needed for status reconciliation', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<upi:RespChkTxn xmlns:upi="http://npci.org/upi/schema/">
  <Head ver="2.0" ts="2026-04-05T09:00:00+02:00" orgId="NPCI" msgId="RESP-CHK-1" prodType="UPI"/>
  <Txn id="CHK-1" note="Check Txn Status" refId="CHK-1" refUrl="https://namlend.na/ipp" ts="2026-04-05T09:00:00+02:00" type="ChkTxn" orgMsgId="PAY-123" orgTxnId="TXN-123" />
  <Resp reqMsgId="REQ-CHK-1" result="SUCCESS" errCode="">
    <Ref type="PAYER" seqNum="1" addr="payer@namlend" respCode="00"/>
    <Ref type="PAYEE" seqNum="1" addr="payee@fnb" respCode="00"/>
  </Resp>
</upi:RespChkTxn>`;

    const parsed = parseRespChkTxnDetails(xml);

    expect(parsed.requestMsgId).toBe('REQ-CHK-1');
    expect(parsed.result).toBe('SUCCESS');
    expect(parsed.orgMsgId).toBe('PAY-123');
    expect(parsed.orgTxnId).toBe('TXN-123');
    expect(parsed.primaryRespCode).toBe('00');
    expect(parsed.payeeAddr).toBe('payee@fnb');
  });

  it('parses RespGetAdd details used by alias lookup flows', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<upi:RespGetAdd xmlns:upi="http://npci.org/upi/schema/">
  <Head ver="2.0" ts="2026-04-05T09:00:00+02:00" orgId="NPCI" msgId="RESP-GETADD-1" prodType="UPI"/>
  <Txn id="GETADD-1" note="Mapper" refId="REF-1" refUrl="https://namlend.na/ipp" ts="2026-04-05T09:00:00+02:00" type="FETCH" subType="VPA" />
  <Resp reqMsgId="REQ-GETADD-1" result="SUCCESS">
    <RegIdDetails addr="user@namlend" type="PERSON" idStatus="ACTIVE" lastUpdatedTs="2026-04-05T09:00:00+02:00" channel="MOB">
      <Id name="MOBILE" value="0811234567" />
      <Id name="NUMERICID" value="100200300" seqNum="1" />
    </RegIdDetails>
  </Resp>
</upi:RespGetAdd>`;

    const parsed = parseRespGetAddDetails(xml);

    expect(parsed.requestMsgId).toBe('REQ-GETADD-1');
    expect(parsed.result).toBe('SUCCESS');
    expect(parsed.operation).toBe('FETCH');
    expect(parsed.addr).toBe('user@namlend');
    expect(parsed.idStatus).toBe('ACTIVE');
    expect(parsed.mobileNumber).toBe('0811234567');
    expect(parsed.numericId).toBe('100200300');
  });
});
