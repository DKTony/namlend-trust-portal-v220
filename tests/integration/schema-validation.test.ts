/**
 * Schema Validation Tests
 * 
 * These tests validate that the frontend code correctly references
 * database column names and relationships.
 */

import { describe, it, expect } from 'vitest';

// Import schema reference constants
import {
  AUDIT_LOGS_COLUMNS,
  STATE_TRANSITIONS_COLUMNS,
  PROFILES_COLUMNS,
  LOANS_COLUMNS,
  PAYMENTS_COLUMNS,
  PAYMENT_SCHEDULES_COLUMNS,
  DISBURSEMENTS_COLUMNS,
  COLUMN_NAME_CORRECTIONS,
} from '@/constants/schemaReference';

import {
  LOAN_STATUS,
  PAYABLE_STATUSES,
  ACTIVE_LOAN_STATUSES,
  PAYMENT_STATUS,
  SCHEDULE_STATUS,
  DISBURSEMENT_STATUS,
} from '@/constants/loanStatuses';

describe('Schema Reference Validation', () => {
  describe('audit_logs table', () => {
    it('should have correct column names', () => {
      expect(AUDIT_LOGS_COLUMNS.user_id).toBe('user_id');
      expect(AUDIT_LOGS_COLUMNS).not.toHaveProperty('performed_by');
    });

    it('should document the common mistake', () => {
      expect(COLUMN_NAME_CORRECTIONS['performed_by']).toBe('user_id');
    });
  });

  describe('state_transitions table', () => {
    it('should have correct column names', () => {
      expect(STATE_TRANSITIONS_COLUMNS.transition_reason).toBe('transition_reason');
      expect(STATE_TRANSITIONS_COLUMNS.triggered_by).toBe('triggered_by');
      expect(STATE_TRANSITIONS_COLUMNS).not.toHaveProperty('reason');
      expect(STATE_TRANSITIONS_COLUMNS).not.toHaveProperty('performed_by');
    });

    it('should document the common mistake', () => {
      expect(COLUMN_NAME_CORRECTIONS['reason']).toBe('transition_reason');
    });
  });

  describe('profiles table', () => {
    it('should have first_name and last_name, not full_name', () => {
      expect(PROFILES_COLUMNS.first_name).toBe('first_name');
      expect(PROFILES_COLUMNS.last_name).toBe('last_name');
      expect(PROFILES_COLUMNS).not.toHaveProperty('full_name');
    });
  });

  describe('loans table', () => {
    it('should have all expected columns', () => {
      expect(LOANS_COLUMNS.id).toBe('id');
      expect(LOANS_COLUMNS.user_id).toBe('user_id');
      expect(LOANS_COLUMNS.status).toBe('status');
      expect(LOANS_COLUMNS.settled_at).toBe('settled_at');
      expect(LOANS_COLUMNS.total_paid).toBe('total_paid');
      expect(LOANS_COLUMNS.outstanding_balance).toBe('outstanding_balance');
    });
  });
});

describe('Loan Status Constants', () => {
  describe('LOAN_STATUS', () => {
    it('should have all expected statuses', () => {
      expect(LOAN_STATUS.PENDING).toBe('pending');
      expect(LOAN_STATUS.APPROVED).toBe('approved');
      expect(LOAN_STATUS.DISBURSED).toBe('disbursed');
      expect(LOAN_STATUS.ACTIVE).toBe('active');
      expect(LOAN_STATUS.SETTLED).toBe('settled');
      expect(LOAN_STATUS.DEFAULTED).toBe('defaulted');
      expect(LOAN_STATUS.REJECTED).toBe('rejected');
    });
  });

  describe('PAYABLE_STATUSES', () => {
    it('should include all statuses that allow payments', () => {
      expect(PAYABLE_STATUSES).toContain('active');
      expect(PAYABLE_STATUSES).toContain('disbursed');
      expect(PAYABLE_STATUSES).toContain('funded');
      expect(PAYABLE_STATUSES).toContain('approved');
    });

    it('should not include closed statuses', () => {
      expect(PAYABLE_STATUSES).not.toContain('settled');
      expect(PAYABLE_STATUSES).not.toContain('defaulted');
      expect(PAYABLE_STATUSES).not.toContain('rejected');
    });
  });

  describe('ACTIVE_LOAN_STATUSES', () => {
    it('should include statuses for active loans', () => {
      expect(ACTIVE_LOAN_STATUSES).toContain('active');
      expect(ACTIVE_LOAN_STATUSES).toContain('disbursed');
    });
  });
});

describe('Payment Status Constants', () => {
  it('should have all expected statuses', () => {
    expect(PAYMENT_STATUS.PENDING).toBe('pending');
    expect(PAYMENT_STATUS.COMPLETED).toBe('completed');
    expect(PAYMENT_STATUS.FAILED).toBe('failed');
  });
});

describe('Schedule Status Constants', () => {
  it('should have all expected statuses', () => {
    expect(SCHEDULE_STATUS.PENDING).toBe('pending');
    expect(SCHEDULE_STATUS.PAID).toBe('paid');
    expect(SCHEDULE_STATUS.PARTIALLY_PAID).toBe('partially_paid');
    expect(SCHEDULE_STATUS.OVERDUE).toBe('overdue');
    expect(SCHEDULE_STATUS.WAIVED).toBe('waived');
  });
});

describe('Disbursement Status Constants', () => {
  it('should have all expected statuses', () => {
    expect(DISBURSEMENT_STATUS.PENDING).toBe('pending');
    expect(DISBURSEMENT_STATUS.APPROVED).toBe('approved');
    expect(DISBURSEMENT_STATUS.PROCESSING).toBe('processing');
    expect(DISBURSEMENT_STATUS.COMPLETED).toBe('completed');
    expect(DISBURSEMENT_STATUS.FAILED).toBe('failed');
  });
});
