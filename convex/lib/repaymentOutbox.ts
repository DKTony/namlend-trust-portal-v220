import { ConvexError } from 'convex/values';
import { Id } from '../_generated/dataModel';

const REPAYMENT_CODES = {
  principal: 2001,
  interest: 5001,
  fees: 5002,
} as const;

/** Reversing entries mirror the repayment legs with distinct codes. */
export const REPAYMENT_REVERSAL_CODES = {
  principal: 2101,
  interest: 5101,
  fees: 5102,
} as const;

export interface RepaymentOutboxInput {
  loanId: Id<'loans'>;
  paymentId: Id<'paymentTransactions'>;
  amount: number;
  principalPaid?: number;
  interestPaid?: number;
  feesPaid?: number;
  mandateId?: Id<'mandates'>;
  executionNumber?: number;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function assertNonNegativeAmount(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `${label} must be a non-negative amount.`,
    });
  }
}

export interface RepaymentOutboxCentsInput {
  loanId: Id<'loans'>;
  paymentId: Id<'paymentTransactions'>;
  amountCents: number;
  principalCents: number;
  interestCents: number;
  feeCents: number;
  /** Overpayment cents excluded from transfers, reported for manual follow-up. */
  surplusCents?: number;
  mandateId?: Id<'mandates'>;
  executionNumber?: number;
}

/**
 * Cents-native payload builder — exact integer arithmetic end to end.
 * The split must conserve every cent: principal + interest + fee + surplus === amount.
 */
export function buildRepaymentOutboxPayloadFromCents(input: RepaymentOutboxCentsInput) {
  const surplusCents = input.surplusCents ?? 0;
  for (const [label, value] of [
    ['amountCents', input.amountCents],
    ['principalCents', input.principalCents],
    ['interestCents', input.interestCents],
    ['feeCents', input.feeCents],
    ['surplusCents', surplusCents],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `${label} must be a non-negative integer number of cents.`,
      });
    }
  }
  if (input.amountCents <= 0) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'Repayment amount must be positive.',
    });
  }
  if (
    input.principalCents + input.interestCents + input.feeCents + surplusCents !==
    input.amountCents
  ) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'Repayment split must equal the total payment amount to the cent.',
    });
  }

  const transfers: Array<{
    debit_type: string;
    credit_type: string;
    amount: number;
    code: number;
  }> = [];

  if (input.principalCents > 0) {
    transfers.push({
      debit_type: 'LOAN_PRINCIPAL_RECEIVABLE',
      credit_type: 'BANK_SETTLEMENT',
      amount: input.principalCents,
      code: REPAYMENT_CODES.principal,
    });
  }
  if (input.interestCents > 0) {
    transfers.push({
      debit_type: 'LOAN_INTEREST_RECEIVABLE',
      credit_type: 'INTEREST_INCOME',
      amount: input.interestCents,
      code: REPAYMENT_CODES.interest,
    });
  }
  if (input.feeCents > 0) {
    transfers.push({
      debit_type: 'BANK_SETTLEMENT',
      credit_type: 'FEE_INCOME',
      amount: input.feeCents,
      code: REPAYMENT_CODES.fees,
    });
  }

  return {
    loan_id: input.loanId,
    payment_id: input.paymentId,
    mandate_id: input.mandateId,
    amount: input.amountCents,
    principal_paid: input.principalCents,
    interest_paid: input.interestCents,
    fees_paid: input.feeCents,
    unallocated_cents: surplusCents > 0 ? surplusCents : undefined,
    execution_number: input.executionNumber,
    transfer_code: transfers[0]?.code ?? REPAYMENT_CODES.principal,
    transfers,
  };
}

/**
 * Reversal payload: mirrors the original repayment legs (accounts swapped)
 * with distinct codes so the ledger shows an explicit reversing entry rather
 * than a deletion. Surplus cents were never posted, so they are not reversed.
 */
export function buildRepaymentReversalPayloadFromCents(
  input: Omit<RepaymentOutboxCentsInput, 'surplusCents'> & { reason?: string }
) {
  for (const [label, value] of [
    ['amountCents', input.amountCents],
    ['principalCents', input.principalCents],
    ['interestCents', input.interestCents],
    ['feeCents', input.feeCents],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `${label} must be a non-negative integer number of cents.`,
      });
    }
  }

  const transfers: Array<{
    debit_type: string;
    credit_type: string;
    amount: number;
    code: number;
  }> = [];

  if (input.principalCents > 0) {
    transfers.push({
      debit_type: 'BANK_SETTLEMENT',
      credit_type: 'LOAN_PRINCIPAL_RECEIVABLE',
      amount: input.principalCents,
      code: REPAYMENT_REVERSAL_CODES.principal,
    });
  }
  if (input.interestCents > 0) {
    transfers.push({
      debit_type: 'INTEREST_INCOME',
      credit_type: 'LOAN_INTEREST_RECEIVABLE',
      amount: input.interestCents,
      code: REPAYMENT_REVERSAL_CODES.interest,
    });
  }
  if (input.feeCents > 0) {
    transfers.push({
      debit_type: 'FEE_INCOME',
      credit_type: 'BANK_SETTLEMENT',
      amount: input.feeCents,
      code: REPAYMENT_REVERSAL_CODES.fees,
    });
  }
  if (transfers.length === 0) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'Reversal must reverse at least one posted transfer leg.',
    });
  }

  return {
    loan_id: input.loanId,
    payment_id: input.paymentId,
    amount: input.amountCents,
    principal_reversed: input.principalCents,
    interest_reversed: input.interestCents,
    fees_reversed: input.feeCents,
    reason: input.reason,
    transfer_code: transfers[0].code,
    transfers,
  };
}

export function buildRepaymentOutboxPayload(input: RepaymentOutboxInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'Repayment amount must be positive.',
    });
  }

  const interestPaid = input.interestPaid ?? 0;
  const feesPaid = input.feesPaid ?? 0;
  const principalPaid = input.principalPaid ?? input.amount - interestPaid - feesPaid;

  assertNonNegativeAmount('Principal paid', principalPaid);
  assertNonNegativeAmount('Interest paid', interestPaid);
  assertNonNegativeAmount('Fees paid', feesPaid);

  const componentTotal = principalPaid + interestPaid + feesPaid;
  if (Math.abs(componentTotal - input.amount) > 0.01) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'Repayment split must equal the total payment amount.',
    });
  }

  // Delegate to the cents-native builder; the residual cent (if the NAD split
  // rounds unevenly) is absorbed into principal so conservation holds.
  const amountCents = toCents(input.amount);
  const interestCents = toCents(interestPaid);
  const feeCents = toCents(feesPaid);
  const principalCents = amountCents - interestCents - feeCents;

  return buildRepaymentOutboxPayloadFromCents({
    loanId: input.loanId,
    paymentId: input.paymentId,
    amountCents,
    principalCents,
    interestCents,
    feeCents,
    mandateId: input.mandateId,
    executionNumber: input.executionNumber,
  });
}
