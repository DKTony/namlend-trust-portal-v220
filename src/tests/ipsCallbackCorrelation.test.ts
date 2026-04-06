import { describe, expect, it } from 'vitest';
import { resolveRespChkTxnResolution } from '../../convex/lib/ipsCallbackCorrelation';

describe('ipsCallbackCorrelation', () => {
  it('reconciles RespChkTxn back to the original payment using outbound correlation', () => {
    const resolution = resolveRespChkTxnResolution({
      details: {
        requestMsgId: 'CHK-REQ-1',
        result: 'SUCCESS',
        orgMsgId: 'PAY-MSG-123',
        orgTxnId: 'PAY-TXN-123',
        primaryRespCode: '00',
      },
      transactionIdFromOutboundLog: 'txn_doc_1',
      originalMsgIdFromOutboundLog: 'PAY-MSG-123',
    });

    expect(resolution.transactionId).toBe('txn_doc_1');
    expect(resolution.originalMsgId).toBe('PAY-MSG-123');
    expect(resolution.originalTxnId).toBe('PAY-TXN-123');
    expect(resolution.resolvedRespCode).toBe('00');
    expect(resolution.status).toBe('completed');
  });

  it('maps pending and deemed callback results to non-terminal internal statuses', () => {
    const pending = resolveRespChkTxnResolution({
      details: {
        result: 'PENDING',
        orgMsgId: 'PAY-MSG-456',
        orgTxnId: 'PAY-TXN-456',
      },
      transactionIdFromPayload: 'txn_doc_2',
    });

    const deemed = resolveRespChkTxnResolution({
      details: {
        result: 'DEEMED',
        orgMsgId: 'PAY-MSG-789',
        orgTxnId: 'PAY-TXN-789',
        errorCode: 'XP',
        errorDescription: 'Timed out waiting for payee PSP',
      },
      transactionIdFromPayload: 'txn_doc_3',
    });

    expect(pending.status).toBe('processing');
    expect(deemed.status).toBe('timeout');
    expect(deemed.resolvedRespCode).toBe('XP');
    expect(deemed.resolvedRespDescription).toContain('Timed out');
  });

  it('falls back to failure mapping when the callback returns a decline code', () => {
    const resolution = resolveRespChkTxnResolution({
      details: {
        result: 'FAILURE',
        orgMsgId: 'PAY-MSG-999',
        orgTxnId: 'PAY-TXN-999',
        primaryRespCode: '51',
        errorDescription: 'Insufficient funds',
      },
      transactionIdFromPayload: 'txn_doc_4',
    });

    expect(resolution.status).toBe('failed');
    expect(resolution.resolvedRespCode).toBe('51');
    expect(resolution.resolvedRespDescription).toBe('Insufficient funds');
  });
});
