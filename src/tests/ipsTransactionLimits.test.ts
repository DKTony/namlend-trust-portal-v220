import {
  getLimitsForType,
  resolveTransactionUseCaseType,
  summarizeTransactionsForUseCaseType,
} from '../../convex/lib/ipsTransactionLimits';

describe('ipsTransactionLimits', () => {
  it('treats outbound disbursement rows as B2P even when older records lack an explicit use-case field', () => {
    expect(
      resolveTransactionUseCaseType({
        txType: 'credit_transfer',
        direction: 'outbound',
        disbursementId: 'disb_123',
        remittanceInfo: 'Loan disbursement disb_123',
      })
    ).toBe('B2P');
  });

  it('only counts transactions from the matching use-case bucket toward that daily limit', () => {
    const summary = summarizeTransactionsForUseCaseType(
      [
        {
          amount: 10_000,
          txType: 'credit_transfer',
          direction: 'inbound',
          useCaseType: 'P2P' as const,
        },
        {
          amount: 5_000,
          txType: 'credit_transfer',
          direction: 'outbound',
          disbursementId: 'disb_456',
        },
      ],
      'B2P'
    );

    expect(summary).toEqual({
      count: 1,
      amount: 5_000,
    });
  });

  it('applies FSD v10 B2P/G2P per-recipient amount limits with unlimited count', () => {
    expect(getLimitsForType('B2P')).toEqual({ maxDailyAmount: 10_000, maxDailyCount: null });
    expect(getLimitsForType('G2P')).toEqual({ maxDailyAmount: 10_000, maxDailyCount: null });
  });
});
