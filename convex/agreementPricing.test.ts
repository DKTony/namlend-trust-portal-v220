/**
 * Cost-of-credit tests. Schedule A section C of the loan agreement is a disclosure the
 * borrower signs, so the arithmetic is pinned here:
 *  - the placeholder rule changes nothing (interest-only, matching today's behaviour)
 *  - fees compose: flat + percentage, capped
 *  - every result is cent-exact — floating dust on a credit agreement is a defect
 *
 * Run: npm run test:convex
 */
import { describe, expect, test } from 'vitest';
import {
  computeCostOfCredit,
  DEFAULT_PRICING,
  totalAmountRepayable,
  type PricingRule,
} from './lib/agreementPricing';

const LOAN = { principal: 10000, termMonths: 6, interestAmount: 960 };

/** A value is cent-exact if scaling by 100 leaves no fractional remainder. */
function isCentExact(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

describe('DEFAULT_PRICING', () => {
  test('is interest-only, so nothing downstream changes until pricing is supplied', () => {
    expect(computeCostOfCredit(LOAN, DEFAULT_PRICING)).toEqual({
      initiationFee: 0,
      administrationFee: 0,
      otherCharges: 0,
      totalCostOfCredit: 960,
    });
  });

  test('is the default argument', () => {
    expect(computeCostOfCredit(LOAN)).toEqual(computeCostOfCredit(LOAN, DEFAULT_PRICING));
  });
});

describe('initiation fee', () => {
  test('flat', () => {
    const rule: PricingRule = { initiationFeeFlat: 150 };
    expect(computeCostOfCredit(LOAN, rule).initiationFee).toBe(150);
  });

  test('percentage of principal', () => {
    const rule: PricingRule = { initiationFeePercent: 2.5 };
    expect(computeCostOfCredit(LOAN, rule).initiationFee).toBe(250);
  });

  test('flat and percentage compose', () => {
    const rule: PricingRule = { initiationFeeFlat: 150, initiationFeePercent: 2.5 };
    expect(computeCostOfCredit(LOAN, rule).initiationFee).toBe(400);
  });

  test('cap applies to the composed fee', () => {
    const rule: PricingRule = {
      initiationFeeFlat: 150,
      initiationFeePercent: 2.5,
      initiationFeeCap: 300,
    };
    expect(computeCostOfCredit(LOAN, rule).initiationFee).toBe(300);
  });

  test('cap does not inflate a fee that is already below it', () => {
    const rule: PricingRule = { initiationFeeFlat: 100, initiationFeeCap: 300 };
    expect(computeCostOfCredit(LOAN, rule).initiationFee).toBe(100);
  });
});

describe('administration fee', () => {
  test('monthly fee multiplies by the term', () => {
    const rule: PricingRule = { administrationFeeMonthly: 25 };
    expect(computeCostOfCredit(LOAN, rule).administrationFee).toBe(150);
  });

  test('flat and monthly compose', () => {
    const rule: PricingRule = { administrationFeeFlat: 50, administrationFeeMonthly: 25 };
    expect(computeCostOfCredit(LOAN, rule).administrationFee).toBe(200);
  });
});

describe('totals', () => {
  test('total cost of credit is interest plus every fee', () => {
    const rule: PricingRule = {
      initiationFeeFlat: 150,
      administrationFeeMonthly: 25,
      otherCharges: 40,
    };
    const cost = computeCostOfCredit(LOAN, rule);
    expect(cost.totalCostOfCredit).toBe(960 + 150 + 150 + 40);
  });

  test('total repayable is the credit amount plus the cost of credit', () => {
    const cost = computeCostOfCredit(LOAN, { initiationFeeFlat: 150 });
    expect(totalAmountRepayable(LOAN.principal, cost)).toBe(10000 + 960 + 150);
  });
});

describe('cent exactness', () => {
  test('a percentage that lands on a fraction of a cent is rounded, not carried', () => {
    // 1.333% of N$7,777.77 = N$103.67727... — must not reach a contract as N$103.677
    const cost = computeCostOfCredit(
      { principal: 7777.77, termMonths: 3, interestAmount: 333.33 },
      { initiationFeePercent: 1.333 }
    );
    expect(cost.initiationFee).toBe(103.68);
    expect(isCentExact(cost.initiationFee)).toBe(true);
    expect(isCentExact(cost.totalCostOfCredit)).toBe(true);
  });

  test('repeated fractional fees do not accumulate float drift over a long term', () => {
    const cost = computeCostOfCredit(
      { principal: 10000, termMonths: 60, interestAmount: 0.1 },
      { administrationFeeMonthly: 0.07 }
    );
    expect(cost.administrationFee).toBe(4.2);
    expect(cost.totalCostOfCredit).toBe(4.3);
    expect(isCentExact(cost.totalCostOfCredit)).toBe(true);
  });
});
