// Client-side payment amount validation shared by Payment page and PaymentModal.
// UX-layer guard only — the authoritative checks live in the Convex mutations.
import { formatNAD } from './currency';

export interface PaymentValidationResult {
  valid: boolean;
  message?: string;
}

// Cent-level tolerance so float artifacts (e.g. 3333.3300000000004) never
// block paying off an exact outstanding balance.
const CENT_TOLERANCE = 0.005;

export function validatePaymentAmount(
  amount: number,
  outstandingBalance: number
): PaymentValidationResult {
  if (!Number.isFinite(amount)) {
    return { valid: false, message: 'Enter a valid payment amount.' };
  }
  if (amount <= 0) {
    return { valid: false, message: 'Payment amount must be greater than N$0.00.' };
  }
  if (Number.isFinite(outstandingBalance) && outstandingBalance > 0) {
    if (amount > outstandingBalance + CENT_TOLERANCE) {
      return {
        valid: false,
        message: `Payment cannot exceed your outstanding balance of ${formatNAD(outstandingBalance)}.`,
      };
    }
  }
  return { valid: true };
}
