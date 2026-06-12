import { ConvexError } from 'convex/values';
import { Id } from '../_generated/dataModel';

const REPAYMENT_CODES = {
  principal: 2001,
  interest: 5001,
  fees: 5002,
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

  const transfers: Array<{
    debit_type: string;
    credit_type: string;
    amount: number;
    code: number;
  }> = [];

  if (principalPaid > 0) {
    transfers.push({
      debit_type: 'LOAN_PRINCIPAL_RECEIVABLE',
      credit_type: 'BANK_SETTLEMENT',
      amount: toCents(principalPaid),
      code: REPAYMENT_CODES.principal,
    });
  }

  if (interestPaid > 0) {
    transfers.push({
      debit_type: 'LOAN_INTEREST_RECEIVABLE',
      credit_type: 'INTEREST_INCOME',
      amount: toCents(interestPaid),
      code: REPAYMENT_CODES.interest,
    });
  }

  if (feesPaid > 0) {
    transfers.push({
      debit_type: 'BANK_SETTLEMENT',
      credit_type: 'FEE_INCOME',
      amount: toCents(feesPaid),
      code: REPAYMENT_CODES.fees,
    });
  }

  return {
    loan_id: input.loanId,
    payment_id: input.paymentId,
    mandate_id: input.mandateId,
    amount: toCents(input.amount),
    principal_paid: toCents(principalPaid),
    interest_paid: toCents(interestPaid),
    fees_paid: toCents(feesPaid),
    execution_number: input.executionNumber,
    transfer_code: transfers[0]?.code ?? REPAYMENT_CODES.principal,
    transfers,
  };
}
