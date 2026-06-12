import { describe, expect, it } from 'vitest';
import {
  getErrorEntry,
  isRetryable,
  isSuccess,
  mapToTransactionStatus,
} from '../../convex/lib/ipsErrorCodes';

describe('ipsErrorCodes', () => {
  it('classifies the required IPP response code coverage set', () => {
    const expectations: Record<
      string,
      { retryable: boolean; status: ReturnType<typeof mapToTransactionStatus>; success?: boolean }
    > = {
      '00': { retryable: false, status: 'completed', success: true },
      Z9: { retryable: false, status: 'failed' },
      ZM: { retryable: false, status: 'failed' },
      AM: { retryable: false, status: 'failed' },
      UP: { retryable: true, status: 'timeout' },
      UT: { retryable: true, status: 'timeout' },
      BT: { retryable: true, status: 'timeout' },
      U17: { retryable: false, status: 'failed' },
      XB: { retryable: false, status: 'failed' },
      XH: { retryable: false, status: 'failed' },
      YE: { retryable: false, status: 'failed' },
      YF: { retryable: false, status: 'failed' },
      '21': { retryable: true, status: 'processing' },
      '32': { retryable: true, status: 'processing' },
      RB: { retryable: true, status: 'timeout' },
      RR: { retryable: true, status: 'timeout' },
      CS: { retryable: false, status: 'completed', success: true },
      NC: { retryable: false, status: 'reversed' },
      ND: { retryable: false, status: 'reversed' },
    };

    for (const [code, expected] of Object.entries(expectations)) {
      expect(getErrorEntry(code).code).toBe(code);
      expect(isRetryable(code)).toBe(expected.retryable);
      expect(mapToTransactionStatus(code)).toBe(expected.status);
      expect(isSuccess(code)).toBe(Boolean(expected.success));
    }
  });
});
