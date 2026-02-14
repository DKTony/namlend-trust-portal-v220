/**
 * Central Type Exports
 * 
 * Re-exports all type definitions for convenient importing throughout the codebase.
 * Import types from '@/types' instead of individual files.
 * 
 * Note: Canonical loan types are in ./loan.ts. The ./services.ts file has legacy
 * loan types (LoanStatus, LoanRecord) that are deprecated - use canonical from ./loan.
 */

// Loan types (canonical) - these take precedence
export * from './loan';

// Admin types
export * from './admin';

// IPS types
export * from './ips';

// Service types - exclude conflicting LoanStatus and LoanRecord (use canonical from ./loan)
export {
  // Disbursement types
  type DisbursementPayload,
  // Collections types
  type RecordActivityResponse,
  type AssignToAgentResponse,
  type RecordPaymentPromiseResponse,
  type MarkPromiseFulfilledResponse,
  type OverdueLoan,
  type CollectionsInteraction,
} from './services';

// Settlement types
export * from './settlement';

// Theme types (includes finance types: UnifiedTransaction, BudgetLimit, SavingsGoal)
export * from './theme';
