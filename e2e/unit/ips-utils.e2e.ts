/**
 * IPS Utility Functions Unit Tests
 * 
 * Unit tests for IPS service utility functions using Playwright test runner
 */

import { test, expect } from '@playwright/test';

// Import the functions we're testing
// Note: These tests run in Node.js, so we need to import the source files
const ipsServicePath = '../../src/services/ipsService';
const ipsTypesPath = '../../src/types/ips';

test.describe('IPS Service Utilities', () => {
  test.describe('formatVPAForDisplay', () => {
    test('should mask middle characters of username', async () => {
      const { formatVPAForDisplay } = await import(ipsServicePath);
      
      expect(formatVPAForDisplay('johndoe@fnb')).toBe('jo***oe@fnb');
      expect(formatVPAForDisplay('testuser@bank')).toBe('te***er@bank');
    });

    test('should not mask short usernames', async () => {
      const { formatVPAForDisplay } = await import(ipsServicePath);
      
      expect(formatVPAForDisplay('ab@fnb')).toBe('ab@fnb');
      expect(formatVPAForDisplay('abc@fnb')).toBe('abc@fnb');
      expect(formatVPAForDisplay('abcd@fnb')).toBe('abcd@fnb');
    });

    test('should handle invalid VPA format', async () => {
      const { formatVPAForDisplay } = await import(ipsServicePath);
      
      expect(formatVPAForDisplay('invalid')).toBe('invalid');
      expect(formatVPAForDisplay('')).toBe('');
    });

    test('should preserve provider name', async () => {
      const { formatVPAForDisplay } = await import(ipsServicePath);
      
      const result = formatVPAForDisplay('longusername@standardbank');
      expect(result.endsWith('@standardbank')).toBe(true);
    });
  });

  test.describe('isValidVPAFormat', () => {
    test('should accept valid VPA formats', async () => {
      const { isValidVPAFormat } = await import(ipsServicePath);
      
      expect(isValidVPAFormat('user@bank')).toBe(true);
      expect(isValidVPAFormat('john.doe@fnb')).toBe(true);
      expect(isValidVPAFormat('user123@bank-na')).toBe(true);
      expect(isValidVPAFormat('test_user@provider')).toBe(true);
      expect(isValidVPAFormat('user-name@bank.na')).toBe(true);
    });

    test('should reject invalid VPA formats', async () => {
      const { isValidVPAFormat } = await import(ipsServicePath);
      
      expect(isValidVPAFormat('invalid')).toBe(false);
      expect(isValidVPAFormat('@bank')).toBe(false);
      expect(isValidVPAFormat('user@')).toBe(false);
      expect(isValidVPAFormat('')).toBe(false);
    });
  });

  test.describe('getVPAProvider', () => {
    test('should extract provider from valid VPA', async () => {
      const { getVPAProvider } = await import(ipsServicePath);
      
      expect(getVPAProvider('user@fnb')).toBe('fnb');
      expect(getVPAProvider('john@standardbank')).toBe('standardbank');
      expect(getVPAProvider('test@bank.na')).toBe('bank.na');
    });

    test('should return null for invalid VPA', async () => {
      const { getVPAProvider } = await import(ipsServicePath);
      
      expect(getVPAProvider('invalid')).toBeNull();
      expect(getVPAProvider('')).toBeNull();
    });
  });
});

test.describe('IPS Types and Constants', () => {
  test.describe('IPS_STATUS_LABELS', () => {
    test('should have labels for all statuses', async () => {
      const { IPS_STATUS_LABELS } = await import(ipsTypesPath);
      
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
      const { IPS_STATUS_COLORS } = await import(ipsTypesPath);
      
      expect(IPS_STATUS_COLORS.success).toContain('green');
      expect(IPS_STATUS_COLORS.failed).toContain('red');
      expect(IPS_STATUS_COLORS.pending).toContain('yellow');
      expect(IPS_STATUS_COLORS.timeout).toContain('orange');
    });
  });

  test.describe('isIPSStatusFinal', () => {
    test('should return true for final statuses', async () => {
      const { isIPSStatusFinal } = await import(ipsTypesPath);
      
      expect(isIPSStatusFinal('success')).toBe(true);
      expect(isIPSStatusFinal('failed')).toBe(true);
      expect(isIPSStatusFinal('reversed')).toBe(true);
      expect(isIPSStatusFinal('deemed')).toBe(true);
    });

    test('should return false for non-final statuses', async () => {
      const { isIPSStatusFinal } = await import(ipsTypesPath);
      
      expect(isIPSStatusFinal('initiated')).toBe(false);
      expect(isIPSStatusFinal('pending')).toBe(false);
      expect(isIPSStatusFinal('sent')).toBe(false);
      expect(isIPSStatusFinal('timeout')).toBe(false);
      expect(isIPSStatusFinal('unknown')).toBe(false);
    });
  });

  test.describe('isIPSStatusSuccess', () => {
    test('should return true for success statuses', async () => {
      const { isIPSStatusSuccess } = await import(ipsTypesPath);
      
      expect(isIPSStatusSuccess('success')).toBe(true);
      expect(isIPSStatusSuccess('deemed')).toBe(true);
    });

    test('should return false for non-success statuses', async () => {
      const { isIPSStatusSuccess } = await import(ipsTypesPath);
      
      expect(isIPSStatusSuccess('failed')).toBe(false);
      expect(isIPSStatusSuccess('pending')).toBe(false);
      expect(isIPSStatusSuccess('reversed')).toBe(false);
      expect(isIPSStatusSuccess('timeout')).toBe(false);
    });
  });
});
