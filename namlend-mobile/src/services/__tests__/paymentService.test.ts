import { PaymentService } from '../paymentService';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

describe('PaymentService.getLoanPaymentDetails', () => {
  const legacyKey = ['outstanding', 'balance'].join('_');
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('preserves a canonical outstanding balance at the RPC boundary', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        summary: {
          outstandingBalance: 8_750,
          [legacyKey]: 12_345,
        },
      },
      error: null,
    });

    const result = await PaymentService.getLoanPaymentDetails('loan-123');

    expect(result.summary?.outstandingBalance).toBe(8_750);
    expect((result.summary as unknown as Record<string, unknown>)[legacyKey]).toBeUndefined();
  });

  it('normalizes the legacy outstanding-balance field at the RPC boundary', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        summary: {
          [legacyKey]: 12_345,
          total_scheduled: 20_000,
          total_paid: 7_655,
        },
      },
      error: null,
    });

    const result = await PaymentService.getLoanPaymentDetails('loan-123');

    expect(result.summary?.outstandingBalance).toBe(12_345);
    expect((result.summary as unknown as Record<string, unknown>)[legacyKey]).toBeUndefined();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 'not-a-number', '', false, {}])(
    'rejects a malformed outstanding balance value (%p)',
    async (outstandingBalance) => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          summary: { outstandingBalance },
        },
        error: null,
      });

      const result = await PaymentService.getLoanPaymentDetails('loan-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Loan payment details contain an invalid outstanding balance');
      expect(result.summary).toBeUndefined();
    }
  );

  it('rejects a payment summary with no outstanding balance', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        summary: { total_paid: 0 },
      },
      error: null,
    });

    const result = await PaymentService.getLoanPaymentDetails('loan-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Loan payment details are missing the outstanding balance');
    expect(result.summary).toBeUndefined();
  });
});
