import { describe, expect, it } from 'vitest';
import { generatePaymentSchedule, toCents } from '../../convex/lib/amortization';
import {
  allocateRepayment,
  computePayoffQuoteCents,
  decomposePaidAmount,
  type ScheduleRowLike,
} from '../../convex/lib/paymentAllocation';

const DISBURSED = new Date('2026-01-15T00:00:00Z');
const NOW = new Date('2026-02-20T00:00:00Z').getTime(); // installment 1 due, 2..n future

/** Build schedule rows from the real amortization engine (authentic rounding). */
function buildRows(
  principal = 10000,
  rate = 20,
  term = 12
): { rows: ScheduleRowLike[]; outstandingCents: number } {
  const entries = generatePaymentSchedule(principal, rate, term, DISBURSED);
  const rows: ScheduleRowLike[] = entries.map((e) => ({
    _id: `row-${e.installmentNumber}`,
    installmentNumber: e.installmentNumber,
    dueDate: e.dueDate,
    principalDue: e.principalDue,
    interestDue: e.interestDue,
    totalDue: e.totalDue,
    status: 'scheduled',
  }));
  return { rows, outstandingCents: toCents(principal) };
}

function conserve(result: ReturnType<typeof allocateRepayment>, amountCents: number) {
  const { principalCents, interestCents, feeCents, surplusCents } = result.totals;
  expect(principalCents + interestCents + feeCents + surplusCents).toBe(amountCents);
}

describe('allocateRepayment — normal mode', () => {
  it('allocates interest first within an installment', () => {
    const { rows, outstandingCents } = buildRows();
    const first = rows[0];
    const pay = toCents(first.interestDue) + 5000; // full interest + N$50 of principal
    const result = allocateRepayment({
      rows,
      amountCents: pay,
      feeCents: 0,
      outstandingBalanceCents: outstandingCents,
      now: NOW,
    });
    expect(result.settlementMode).toBe(false);
    expect(result.allocations).toHaveLength(1);
    const a = result.allocations[0];
    expect(a.interestCents).toBe(toCents(first.interestDue));
    expect(a.principalCents).toBe(5000);
    expect(a.newStatus).toBe('partially_paid');
    conserve(result, pay);
  });

  it('a tiny payment goes entirely to interest and marks partially_paid', () => {
    const { rows, outstandingCents } = buildRows();
    const result = allocateRepayment({
      rows,
      amountCents: 1000, // N$10
      feeCents: 0,
      outstandingBalanceCents: outstandingCents,
      now: NOW,
    });
    const a = result.allocations[0];
    expect(a.interestCents).toBe(1000);
    expect(a.principalCents).toBe(0);
    expect(a.newStatus).toBe('partially_paid');
    expect(result.newLoanBalanceCents).toBe(outstandingCents); // no principal retired
    conserve(result, 1000);
  });

  it('resumes a partially_paid row: remaining interest first, then principal', () => {
    const { rows, outstandingCents } = buildRows();
    // Simulate a prior partial payment of N$100, all interest
    rows[0] = {
      ...rows[0],
      status: 'partially_paid',
      paidAmount: 100,
      principalPaidAmount: 0,
      interestPaidAmount: 100,
    };
    const interestLeft = toCents(rows[0].interestDue) - 10000;
    const pay = interestLeft + 2500;
    const result = allocateRepayment({
      rows,
      amountCents: pay,
      feeCents: 0,
      outstandingBalanceCents: outstandingCents,
      now: NOW,
    });
    const a = result.allocations[0];
    expect(a.interestCents).toBe(interestLeft);
    expect(a.principalCents).toBe(2500);
    expect(a.newInterestPaidAmountCents).toBe(toCents(rows[0].interestDue));
    conserve(result, pay);
  });

  it('three partial payments accumulate to exactly totalDue with odd cents', () => {
    const { rows, outstandingCents } = buildRows();
    let current = [...rows];
    let outstanding = outstandingCents;
    const totalDueCents = toCents(rows[0].totalDue);
    const chunks = [3333, 3333, totalDueCents - 6666];

    for (const chunk of chunks) {
      const result = allocateRepayment({
        rows: current,
        amountCents: chunk,
        feeCents: 0,
        outstandingBalanceCents: outstanding,
        now: NOW,
      });
      conserve(result, chunk);
      const a = result.allocations[0];
      // Apply the allocation back to the row (as repaymentApplication will)
      current = current.map((r) =>
        r._id === a.scheduleId
          ? {
              ...r,
              status: a.newStatus,
              paidAmount: a.newPaidAmountCents / 100,
              principalPaidAmount: a.newPrincipalPaidAmountCents / 100,
              interestPaidAmount: a.newInterestPaidAmountCents / 100,
            }
          : r
      );
      outstanding = result.newLoanBalanceCents;
    }

    const settled = current[0];
    expect(settled.status).toBe('paid');
    expect(toCents(settled.paidAmount!)).toBe(totalDueCents);
    expect(toCents(settled.principalPaidAmount!) + toCents(settled.interestPaidAmount!)).toBe(
      totalDueCents
    );
  });

  it('excludes fees from schedule allocation', () => {
    const { rows, outstandingCents } = buildRows();
    const result = allocateRepayment({
      rows,
      amountCents: 12500, // N$125 incl. N$25 fee
      feeCents: 2500,
      outstandingBalanceCents: outstandingCents,
      now: NOW,
    });
    expect(result.totals.feeCents).toBe(2500);
    expect(result.totals.principalCents + result.totals.interestCents).toBe(10000);
    conserve(result, 12500);
  });

  it('spans multiple installments when the payment covers more than one', () => {
    const { rows, outstandingCents } = buildRows();
    const two = toCents(rows[0].totalDue) + toCents(rows[1].totalDue) + 100;
    const result = allocateRepayment({
      rows,
      amountCents: two,
      feeCents: 0,
      outstandingBalanceCents: outstandingCents,
      now: NOW,
    });
    expect(result.allocations).toHaveLength(3);
    expect(result.allocations[0].newStatus).toBe('paid');
    expect(result.allocations[1].newStatus).toBe('paid');
    expect(result.allocations[2].newStatus).toBe('partially_paid');
    conserve(result, two);
  });
});

describe('allocateRepayment — settlement mode', () => {
  it('fresh loan: quote equals outstanding, full-balance payment is all principal and pays off', () => {
    const { rows, outstandingCents } = buildRows();
    const beforeDue = rows[0].dueDate - 1000; // nothing due yet
    const quote = computePayoffQuoteCents(rows, outstandingCents / 100, beforeDue);
    expect(quote).toBe(outstandingCents);

    const result = allocateRepayment({
      rows,
      amountCents: outstandingCents,
      feeCents: 0,
      outstandingBalanceCents: outstandingCents,
      now: beforeDue,
    });
    expect(result.settlementMode).toBe(true);
    expect(result.paidOff).toBe(true);
    expect(result.totals.interestCents).toBe(0);
    expect(result.totals.principalCents).toBe(outstandingCents);
    expect(result.totals.surplusCents).toBe(0);
    // Every installment extinguished: paid or waived, none left unsettled
    expect(
      result.allocations.every((a) => a.newStatus === 'paid' || a.newStatus === 'waived')
    ).toBe(true);
    expect(result.allocations.some((a) => a.waived)).toBe(true); // unearned interest rebated
    conserve(result, outstandingCents);
  });

  it('delinquent loan: payoff quote includes due interest and settlement books it', () => {
    const { rows, outstandingCents } = buildRows();
    const dueInterest = toCents(rows[0].interestDue);
    const quote = computePayoffQuoteCents(rows, outstandingCents / 100, NOW);
    expect(quote).toBe(outstandingCents + dueInterest);

    const result = allocateRepayment({
      rows,
      amountCents: quote,
      feeCents: 0,
      outstandingBalanceCents: outstandingCents,
      now: NOW,
    });
    expect(result.settlementMode).toBe(true);
    expect(result.paidOff).toBe(true);
    expect(result.totals.interestCents).toBe(dueInterest);
    expect(result.totals.principalCents).toBe(outstandingCents);
    conserve(result, quote);
  });

  it('reports overpayment surplus instead of absorbing it', () => {
    const { rows, outstandingCents } = buildRows();
    const quote = computePayoffQuoteCents(rows, outstandingCents / 100, NOW);
    const over = quote + 7777;
    const result = allocateRepayment({
      rows,
      amountCents: over,
      feeCents: 0,
      outstandingBalanceCents: outstandingCents,
      now: NOW,
    });
    expect(result.totals.surplusCents).toBe(7777);
    expect(result.paidOff).toBe(true);
    conserve(result, over);
  });
});

describe('decomposePaidAmount', () => {
  it('uses stored decomposition when present', () => {
    const d = decomposePaidAmount({
      _id: 'x',
      installmentNumber: 1,
      dueDate: 0,
      principalDue: 800,
      interestDue: 150,
      totalDue: 950,
      paidAmount: 500,
      principalPaidAmount: 400,
      interestPaidAmount: 100,
      status: 'partially_paid',
    });
    expect(d).toEqual({ principalPaidCents: 40000, interestPaidCents: 10000 });
  });

  it('falls back to interest-first for legacy rows', () => {
    const d = decomposePaidAmount({
      _id: 'x',
      installmentNumber: 1,
      dueDate: 0,
      principalDue: 800,
      interestDue: 150,
      totalDue: 950,
      paidAmount: 500,
      status: 'partially_paid',
    });
    expect(d).toEqual({ principalPaidCents: 35000, interestPaidCents: 15000 });
  });
});

describe('allocateRepayment — guards', () => {
  it('rejects non-integer cents and fee > amount', () => {
    const { rows, outstandingCents } = buildRows();
    expect(() =>
      allocateRepayment({
        rows,
        amountCents: 100.5,
        feeCents: 0,
        outstandingBalanceCents: outstandingCents,
        now: NOW,
      })
    ).toThrow();
    expect(() =>
      allocateRepayment({
        rows,
        amountCents: 100,
        feeCents: 200,
        outstandingBalanceCents: outstandingCents,
        now: NOW,
      })
    ).toThrow();
  });

  it('skips paid and waived rows entirely', () => {
    const { rows, outstandingCents } = buildRows();
    rows[0] = { ...rows[0], status: 'paid', paidAmount: rows[0].totalDue };
    const result = allocateRepayment({
      rows,
      amountCents: 5000,
      feeCents: 0,
      outstandingBalanceCents: outstandingCents,
      now: NOW,
    });
    expect(result.allocations[0].scheduleId).toBe('row-2');
  });
});

describe('allocateRepayment — schedule-less loans (direct principal)', () => {
  it('retires principal directly when no schedule rows exist', () => {
    const result = allocateRepayment({
      rows: [],
      amountCents: 50000,
      feeCents: 0,
      outstandingBalanceCents: 135000,
      now: NOW,
    });
    expect(result.directPrincipalCents).toBe(50000);
    expect(result.totals.principalCents).toBe(50000);
    expect(result.totals.surplusCents).toBe(0);
    expect(result.newLoanBalanceCents).toBe(85000);
    expect(result.paidOff).toBe(false);
    conserve(result, 50000);
  });

  it('full payment on a schedule-less loan pays off with zero surplus', () => {
    const result = allocateRepayment({
      rows: [],
      amountCents: 135000,
      feeCents: 0,
      outstandingBalanceCents: 135000,
      now: NOW,
    });
    expect(result.settlementMode).toBe(true);
    expect(result.paidOff).toBe(true);
    expect(result.totals.principalCents).toBe(135000);
    expect(result.totals.surplusCents).toBe(0);
    conserve(result, 135000);
  });
});
