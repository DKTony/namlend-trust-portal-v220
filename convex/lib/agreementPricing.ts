/**
 * Cost of credit — the fee side of Schedule A section C of the loan agreement.
 *
 * `convex/lib/amortization.ts` already computes interest and instalments. This module
 * owns the part that is NOT interest: the initiation fee, the administration fee, any
 * other lawful charge, and the total cost of credit that the borrower is shown before
 * they sign. Clause 5 of the standard terms requires it:
 *
 *   "OG Financial Services CC's approved product pricing must be inserted into the
 *    Loan Schedule before the agreement is used with customers."
 *
 * Kept separate from amortization on purpose: interest maths is fixed by the loan
 * contract shape, whereas fees are a business rule that a lender changes, that differs
 * per product, and that regulators inspect. Pricing changes should not touch the
 * instalment calculator.
 *
 * NAD throughout, matching `loans.principal` — cents conversion happens at the
 * TigerBeetle outbox boundary, not here.
 */

/** Rounds to whole cents. Fees land on signed contracts; floating dust does not. */
function toCents(nad: number): number {
  return Math.round(nad * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export interface CostOfCredit {
  /** Once-off fee for establishing the loan. */
  initiationFee: number;
  /** Ongoing servicing fee, expressed as the total over the loan term. */
  administrationFee: number;
  /** Any other lawful charge disclosed in the quotation. */
  otherCharges: number;
  /** interest + initiationFee + administrationFee + otherCharges. */
  totalCostOfCredit: number;
}

export interface PricingInput {
  /** Credit amount advanced, in NAD. */
  principal: number;
  termMonths: number;
  /** Total interest over the term, from `calculateTotalInterest`. */
  interestAmount: number;
}

/**
 * Product pricing rule. Supplied per product so a short-term product and a 12-month
 * product can price differently; `DEFAULT_PRICING` applies when a loan has no product.
 */
export interface PricingRule {
  initiationFeeFlat?: number;
  initiationFeePercent?: number;
  initiationFeeCap?: number;
  administrationFeeMonthly?: number;
  administrationFeeFlat?: number;
  otherCharges?: number;
}

/**
 * Placeholder until OG Financial's approved pricing is supplied. All zero, so the
 * agreement renders a mathematically consistent (fee-free) quotation rather than
 * inventing a fee — a wrong number on a credit agreement is worse than no number.
 */
export const DEFAULT_PRICING: PricingRule = {};

/**
 * Compute the disclosed cost of credit for a loan.
 *
 * TODO(OG Financial): replace the body with the approved pricing rule. The decisions
 * this function encodes, which are business/regulatory calls and not implementation
 * details:
 *   1. Is the initiation fee flat, a percentage of principal, or a percentage capped
 *      at some NAD ceiling?
 *   2. Is the administration fee charged once or per month? If per month, does a
 *      settled-early loan get a refund of the unaccrued portion?
 *   3. Do fees count toward the 32% APR ceiling in `convex/lib/regulatory.ts`? If the
 *      cap applies to total cost of credit rather than interest alone, `isValidAPR`
 *      and the `createLoan` gate both have to change — see docs/LOAN_AGREEMENT.md §12.
 *
 * Until then this returns interest-only, which is exactly what `loans.totalRepayment`
 * already assumes, so nothing downstream changes behaviour.
 */
export function computeCostOfCredit(
  input: PricingInput,
  rule: PricingRule = DEFAULT_PRICING
): CostOfCredit {
  const initiationCents = Math.min(
    toCents(rule.initiationFeeFlat ?? 0) +
      Math.round(toCents(input.principal) * ((rule.initiationFeePercent ?? 0) / 100)),
    rule.initiationFeeCap !== undefined ? toCents(rule.initiationFeeCap) : Number.MAX_SAFE_INTEGER
  );
  const adminCents =
    toCents(rule.administrationFeeFlat ?? 0) +
    toCents(rule.administrationFeeMonthly ?? 0) * input.termMonths;
  const otherCents = toCents(rule.otherCharges ?? 0);

  return {
    initiationFee: fromCents(initiationCents),
    administrationFee: fromCents(adminCents),
    otherCharges: fromCents(otherCents),
    totalCostOfCredit: fromCents(
      toCents(input.interestAmount) + initiationCents + adminCents + otherCents
    ),
  };
}

/** Total the borrower repays: credit amount + every disclosed cost. */
export function totalAmountRepayable(principal: number, cost: CostOfCredit): number {
  return fromCents(toCents(principal) + toCents(cost.totalCostOfCredit));
}
