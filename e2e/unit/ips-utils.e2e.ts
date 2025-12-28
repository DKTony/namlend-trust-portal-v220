/**
 * IPS Utility Functions Unit Tests
 * 
 * Unit tests for IPS types and constants using Playwright test runner.
 * Note: ipsService.ts cannot be dynamically imported in Node.js due to
 * Vite-specific imports (import.meta.env, @/ path aliases).
 * Pure utility functions are tested inline below.
 */

import { test, expect } from '@playwright/test';

// Pure utility functions (copied for testing - these mirror ipsService.ts)
function formatVPAForDisplay(vpa: string): string {
  const parts = vpa.split('@');
  if (parts.length !== 2) return vpa;
  
  const username = parts[0];
  if (username.length <= 4) return vpa;
  
  const masked = username.slice(0, 2) + '***' + username.slice(-2);
  return `${masked}@${parts[1]}`;
}

function isValidVPAFormat(vpa: string): boolean {
  const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  return vpaRegex.test(vpa);
}

function getVPAProvider(vpa: string): string | null {
  const parts = vpa.split('@');
  return parts.length === 2 ? parts[1] : null;
}

test.describe('IPS Service Utilities', () => {
  test.describe('formatVPAForDisplay', () => {
    test('should mask middle characters of username', async () => {
      expect(formatVPAForDisplay('johndoe@fnb')).toBe('jo***oe@fnb');
      expect(formatVPAForDisplay('testuser@bank')).toBe('te***er@bank');
    });

    test('should not mask short usernames', async () => {
      expect(formatVPAForDisplay('ab@fnb')).toBe('ab@fnb');
      expect(formatVPAForDisplay('abc@fnb')).toBe('abc@fnb');
      expect(formatVPAForDisplay('abcd@fnb')).toBe('abcd@fnb');
    });

    test('should handle invalid VPA format', async () => {
      expect(formatVPAForDisplay('invalid')).toBe('invalid');
      expect(formatVPAForDisplay('')).toBe('');
    });

    test('should preserve provider name', async () => {
      const result = formatVPAForDisplay('longusername@standardbank');
      expect(result.endsWith('@standardbank')).toBe(true);
    });
  });

  test.describe('isValidVPAFormat', () => {
    test('should accept valid VPA formats', async () => {
      expect(isValidVPAFormat('user@bank')).toBe(true);
      expect(isValidVPAFormat('john.doe@fnb')).toBe(true);
      expect(isValidVPAFormat('user123@bank-na')).toBe(true);
      expect(isValidVPAFormat('test_user@provider')).toBe(true);
      expect(isValidVPAFormat('user-name@bank.na')).toBe(true);
    });

    test('should reject invalid VPA formats', async () => {
      expect(isValidVPAFormat('invalid')).toBe(false);
      expect(isValidVPAFormat('@bank')).toBe(false);
      expect(isValidVPAFormat('user@')).toBe(false);
      expect(isValidVPAFormat('')).toBe(false);
    });
  });

  test.describe('getVPAProvider', () => {
    test('should extract provider from valid VPA', async () => {
      expect(getVPAProvider('user@fnb')).toBe('fnb');
      expect(getVPAProvider('john@standardbank')).toBe('standardbank');
      expect(getVPAProvider('test@bank.na')).toBe('bank.na');
    });

    test('should return null for invalid VPA', async () => {
      expect(getVPAProvider('invalid')).toBeNull();
      expect(getVPAProvider('')).toBeNull();
    });
  });
});

// IPS constants (copied for testing - these mirror ips.ts)
type IPSTransactionStatus = 'initiated' | 'pending' | 'sent' | 'success' | 'failed' | 'timeout' | 'reversed' | 'deemed' | 'unknown';

const IPS_STATUS_LABELS: Record<IPSTransactionStatus, string> = {
  initiated: 'Initiated',
  pending: 'Processing',
  sent: 'Sent to Bank',
  success: 'Successful',
  failed: 'Failed',
  timeout: 'Timed Out',
  reversed: 'Reversed',
  deemed: 'Deemed Successful',
  unknown: 'Unknown',
};

const IPS_STATUS_COLORS: Record<IPSTransactionStatus, string> = {
  initiated: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  timeout: 'bg-orange-100 text-orange-800',
  reversed: 'bg-purple-100 text-purple-800',
  deemed: 'bg-green-100 text-green-800',
  unknown: 'bg-gray-100 text-gray-800',
};

const isIPSStatusFinal = (status: IPSTransactionStatus): boolean => {
  return ['success', 'failed', 'reversed', 'deemed'].includes(status);
};

const isIPSStatusSuccess = (status: IPSTransactionStatus): boolean => {
  return ['success', 'deemed'].includes(status);
};

test.describe('IPS Types and Constants', () => {
  test.describe('IPS_STATUS_LABELS', () => {
    test('should have labels for all statuses', async () => {
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

  test.describe('IPS_STATUS_COLORS', () => {
    test('should have colors for all statuses', async () => {
      expect(IPS_STATUS_COLORS.success).toContain('green');
      expect(IPS_STATUS_COLORS.failed).toContain('red');
      expect(IPS_STATUS_COLORS.pending).toContain('yellow');
      expect(IPS_STATUS_COLORS.timeout).toContain('orange');
    });
  });

  test.describe('isIPSStatusFinal', () => {
    test('should return true for final statuses', async () => {
      expect(isIPSStatusFinal('success')).toBe(true);
      expect(isIPSStatusFinal('failed')).toBe(true);
      expect(isIPSStatusFinal('reversed')).toBe(true);
      expect(isIPSStatusFinal('deemed')).toBe(true);
    });

    test('should return false for non-final statuses', async () => {
      expect(isIPSStatusFinal('initiated')).toBe(false);
      expect(isIPSStatusFinal('pending')).toBe(false);
      expect(isIPSStatusFinal('sent')).toBe(false);
      expect(isIPSStatusFinal('timeout')).toBe(false);
      expect(isIPSStatusFinal('unknown')).toBe(false);
    });
  });

  test.describe('isIPSStatusSuccess', () => {
    test('should return true for success statuses', async () => {
      expect(isIPSStatusSuccess('success')).toBe(true);
      expect(isIPSStatusSuccess('deemed')).toBe(true);
    });

    test('should return false for non-success statuses', async () => {
      expect(isIPSStatusSuccess('failed')).toBe(false);
      expect(isIPSStatusSuccess('pending')).toBe(false);
      expect(isIPSStatusSuccess('reversed')).toBe(false);
      expect(isIPSStatusSuccess('timeout')).toBe(false);
    });
  });
});
