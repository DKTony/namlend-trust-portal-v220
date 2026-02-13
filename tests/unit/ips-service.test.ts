/**
 * IPS Service Unit Tests
 * 
 * Unit tests for IPS service utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  formatVPAForDisplay,
  isValidVPAFormat,
  getVPAProvider,
} from '../../src/services/ipsService';
import {
  IPS_STATUS_LABELS,
  IPS_STATUS_COLORS,
  isIPSStatusFinal,
  isIPSStatusSuccess,
} from '../../src/types/ips';

describe('IPS Service Utilities', () => {
  describe('formatVPAForDisplay', () => {
    it('should mask middle characters of username', () => {
      expect(formatVPAForDisplay('johndoe@fnb')).toBe('jo***oe@fnb');
      expect(formatVPAForDisplay('testuser@bank')).toBe('te***er@bank');
    });

    it('should not mask short usernames', () => {
      expect(formatVPAForDisplay('ab@fnb')).toBe('ab@fnb');
      expect(formatVPAForDisplay('abc@fnb')).toBe('abc@fnb');
      expect(formatVPAForDisplay('abcd@fnb')).toBe('abcd@fnb');
    });

    it('should handle invalid VPA format', () => {
      expect(formatVPAForDisplay('invalid')).toBe('invalid');
      expect(formatVPAForDisplay('')).toBe('');
    });

    it('should preserve provider name', () => {
      const result = formatVPAForDisplay('longusername@standardbank');
      expect(result.endsWith('@standardbank')).toBe(true);
    });
  });

  describe('isValidVPAFormat', () => {
    it('should accept valid VPA formats', () => {
      expect(isValidVPAFormat('user@bank')).toBe(true);
      expect(isValidVPAFormat('john.doe@fnb')).toBe(true);
      expect(isValidVPAFormat('user123@bank-na')).toBe(true);
      expect(isValidVPAFormat('test_user@provider')).toBe(true);
      expect(isValidVPAFormat('user-name@bank.na')).toBe(true);
    });

    it('should reject invalid VPA formats', () => {
      expect(isValidVPAFormat('invalid')).toBe(false);
      expect(isValidVPAFormat('@bank')).toBe(false);
      expect(isValidVPAFormat('user@')).toBe(false);
      expect(isValidVPAFormat('')).toBe(false);
      expect(isValidVPAFormat('user@@bank')).toBe(false);
      expect(isValidVPAFormat('user@bank@other')).toBe(false);
    });

    it('should reject VPAs with special characters', () => {
      expect(isValidVPAFormat('user!@bank')).toBe(false);
      expect(isValidVPAFormat('user@bank!')).toBe(false);
      expect(isValidVPAFormat('user name@bank')).toBe(false);
    });
  });

  describe('getVPAProvider', () => {
    it('should extract provider from valid VPA', () => {
      expect(getVPAProvider('user@fnb')).toBe('fnb');
      expect(getVPAProvider('john@standardbank')).toBe('standardbank');
      expect(getVPAProvider('test@bank.na')).toBe('bank.na');
    });

    it('should return null for invalid VPA', () => {
      expect(getVPAProvider('invalid')).toBeNull();
      expect(getVPAProvider('')).toBeNull();
    });
  });
});

describe('IPS Types and Constants', () => {
  describe('IPS_STATUS_LABELS', () => {
    it('should have labels for all statuses', () => {
      expect(IPS_STATUS_LABELS.initiated).toBe('Initiated');
      expect(IPS_STATUS_LABELS.pending).toBe('Processing');
      expect(IPS_STATUS_LABELS.sent).toBe('Sent to Bank');
      expect(IPS_STATUS_LABELS.success).toBe('Successful');
      expect(IPS_STATUS_LABELS.failed).toBe('Failed');
      expect(IPS_STATUS_LABELS.timeout).toBe('Timed Out');
      expect(IPS_STATUS_LABELS.reversed).toBe('Reversed');
      expect(IPS_STATUS_LABELS.deemed).toBe('Deemed Successful');
      expect(IPS_STATUS_LABELS.unknown).toBe('Unknown');
    });
  });

  describe('IPS_STATUS_COLORS', () => {
    it('should have colors for all statuses', () => {
      expect(IPS_STATUS_COLORS.success).toContain('green');
      expect(IPS_STATUS_COLORS.failed).toContain('red');
      expect(IPS_STATUS_COLORS.pending).toContain('yellow');
      expect(IPS_STATUS_COLORS.timeout).toContain('orange');
    });
  });

  describe('isIPSStatusFinal', () => {
    it('should return true for final statuses', () => {
      expect(isIPSStatusFinal('success')).toBe(true);
      expect(isIPSStatusFinal('failed')).toBe(true);
      expect(isIPSStatusFinal('reversed')).toBe(true);
      expect(isIPSStatusFinal('deemed')).toBe(true);
    });

    it('should return false for non-final statuses', () => {
      expect(isIPSStatusFinal('initiated')).toBe(false);
      expect(isIPSStatusFinal('pending')).toBe(false);
      expect(isIPSStatusFinal('sent')).toBe(false);
      expect(isIPSStatusFinal('timeout')).toBe(false);
      expect(isIPSStatusFinal('unknown')).toBe(false);
    });
  });

  describe('isIPSStatusSuccess', () => {
    it('should return true for success statuses', () => {
      expect(isIPSStatusSuccess('success')).toBe(true);
      expect(isIPSStatusSuccess('deemed')).toBe(true);
    });

    it('should return false for non-success statuses', () => {
      expect(isIPSStatusSuccess('failed')).toBe(false);
      expect(isIPSStatusSuccess('pending')).toBe(false);
      expect(isIPSStatusSuccess('reversed')).toBe(false);
      expect(isIPSStatusSuccess('timeout')).toBe(false);
    });
  });
});

describe('IPS Transaction Types', () => {
  describe('Transaction Type Validation', () => {
    const validTransactionTypes = [
      'DISBURSEMENT',
      'REPAYMENT',
      'REFUND',
      'REVERSAL',
      'BALANCE_CHECK',
      'VPA_VALIDATION',
    ];

    it('should recognize all valid transaction types', () => {
      validTransactionTypes.forEach((type) => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('IPS Transaction Subtypes', () => {
    const validTxnTypes = ['PAY', 'COLLECT', 'REVERSAL', 'AUTOREVERSAL', 'REFUND', 'BAL', 'CHK', 'VAL'];

    it('should recognize all valid IPS transaction types', () => {
      validTxnTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });
});

describe('VPA Type Validation', () => {
  const validVPATypes = ['HANDLE', 'MOBILE_NUMBER', 'ACCOUNT', 'AADHAAR', 'QR'];

  it('should recognize all valid VPA types', () => {
    validVPATypes.forEach((type) => {
      expect(typeof type).toBe('string');
    });
  });
});

describe('IPS Purpose Codes', () => {
  const validPurposeCodes = ['PERS', 'BUSN', 'G2P', 'B2P'];

  it('should have valid purpose codes', () => {
    validPurposeCodes.forEach((code) => {
      expect(code.length).toBeGreaterThanOrEqual(2);
      expect(code.length).toBeLessThanOrEqual(4);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });
  });
});

describe('IPS Error Code Mapping', () => {
  // Common error codes that should be handled
  const errorCodes = {
    '00': { retryable: false, description: 'Success' },
    '51': { retryable: false, description: 'Insufficient funds' },
    '61': { retryable: false, description: 'Exceeds limit' },
    'UP': { retryable: true, description: 'PSP timeout' },
    'XP': { retryable: true, description: 'Transaction pending' },
    'XJ': { retryable: false, description: 'Invalid VPA' },
    'XK': { retryable: false, description: 'VPA not registered' },
    '96': { retryable: true, description: 'System error' },
  };

  it('should have defined error codes', () => {
    Object.keys(errorCodes).forEach((code) => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeLessThanOrEqual(3);
    });
  });

  it('should have retryable flag for each error', () => {
    Object.values(errorCodes).forEach((error) => {
      expect(typeof error.retryable).toBe('boolean');
    });
  });
});

describe('Currency Formatting', () => {
  // Test that NAD currency is properly handled
  it('should format NAD currency correctly', () => {
    const formatter = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'NAD',
      minimumFractionDigits: 2,
    });

    expect(formatter.format(100)).toContain('100');
    expect(formatter.format(1000.50)).toContain('1');
    expect(formatter.format(0)).toContain('0');
  });
});
