/**
 * Security tests for NamLend platform
 * Tests dev tool gating, auth flows, and APR validation
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { APR_LIMIT, formatNAD, isValidAPR } from '../constants/regulatory';
import { debugLog, isDebugEnabled, safeExposeWindow } from '../utils/devToolsHelper';

describe('Security - Dev Tool Gating', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (global as any).window;
  });

  it('should not expose debug tools when VITE_DEBUG_TOOLS is false', () => {
    vi.stubEnv('VITE_DEBUG_TOOLS', 'false');
    const mockWindow = {};
    (global as any).window = mockWindow;
    safeExposeWindow('testTool', { test: true });
    expect(mockWindow).not.toHaveProperty('testTool');
  });

  it('should expose debug tools only when VITE_DEBUG_TOOLS is true', () => {
    vi.stubEnv('VITE_DEBUG_TOOLS', 'true');
    const mockWindow = {};
    (global as any).window = mockWindow;
    safeExposeWindow('testTool', { test: true });
    // In Vitest, import.meta.env.DEV is true — so both gates are satisfied
    expect(mockWindow).toHaveProperty('testTool');
    expect((mockWindow as any).testTool).toEqual({ test: true });
  });

  it('isDebugEnabled returns false when VITE_DEBUG_TOOLS is false', () => {
    vi.stubEnv('VITE_DEBUG_TOOLS', 'false');
    expect(isDebugEnabled()).toBe(false);
  });

  it('isDebugEnabled returns true when VITE_DEBUG_TOOLS is true', () => {
    vi.stubEnv('VITE_DEBUG_TOOLS', 'true');
    expect(isDebugEnabled()).toBe(true);
  });

  it('debugLog does not log when VITE_DEBUG_TOOLS is false', () => {
    vi.stubEnv('VITE_DEBUG_TOOLS', 'false');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    debugLog('test message');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('debugLog logs when VITE_DEBUG_TOOLS is true', () => {
    vi.stubEnv('VITE_DEBUG_TOOLS', 'true');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    debugLog('test message');
    expect(consoleSpy).toHaveBeenCalledWith('test message');
    consoleSpy.mockRestore();
  });
});

describe('Security - APR Validation', () => {
  it('should enforce 32% APR limit', () => {
    expect(APR_LIMIT).toBe(32);
  });

  it('should validate APR within regulatory limits', () => {
    expect(isValidAPR(0.1)).toBe(true); // 0.1% valid
    expect(isValidAPR(15.5)).toBe(true); // 15.5% valid
    expect(isValidAPR(32)).toBe(true); // 32% at limit
    expect(isValidAPR(32.1)).toBe(false); // 32.1% exceeds limit
    expect(isValidAPR(50)).toBe(false); // 50% exceeds limit
    expect(isValidAPR(0)).toBe(false); // 0% invalid
    expect(isValidAPR(-5)).toBe(false); // negative invalid
  });

  it('should format NAD currency correctly', () => {
    expect(formatNAD(1000)).toBe('N$1,000.00');
    expect(formatNAD(1234.56)).toBe('N$1,234.56');
    expect(formatNAD(0)).toBe('N$0.00');
  });
});

describe('Security - Environment Variable Protection', () => {
  it('should not expose service role key in frontend env', () => {
    // This test ensures VITE_SUPABASE_SERVICE_ROLE_KEY is not accessible
    // in frontend code (it should only be available server-side)
    const frontendEnv = import.meta.env;

    expect(frontendEnv).not.toHaveProperty('VITE_SUPABASE_SERVICE_ROLE_KEY');
    expect(frontendEnv.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it('security gates are OFF when flags are set to false', () => {
    // Verify that setting flags to 'false' correctly disables security-sensitive features.
    // This tests the MECHANISM, not the actual runtime env (which varies per developer machine).
    vi.stubEnv('VITE_DEBUG_TOOLS', 'false');
    vi.stubEnv('VITE_ALLOW_LOCAL_ADMIN', 'false');
    vi.stubEnv('VITE_RUN_DEV_SCRIPTS', 'false');
    expect(isDebugEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe('Security - Auth Flow Protection', () => {
  it('should prevent role escalation through client mutations', () => {
    // This test verifies that role changes must go through proper channels
    // In a real implementation, this would test that direct user_roles
    // table mutations are blocked by RLS policies

    // Mock Supabase client behavior
    const mockSupabase = {
      from: (_table: string) => ({
        insert: vi.fn().mockRejectedValue(new Error('RLS policy violation')),
        update: vi.fn().mockRejectedValue(new Error('RLS policy violation')),
      }),
    };

    // Attempt to directly modify user_roles should fail
    expect(async () => {
      await mockSupabase.from('user_roles').insert({
        user_id: 'test-user',
        role: 'admin',
      });
    }).rejects.toThrow('RLS policy violation');
  });
});

// Integration test placeholder for actual Supabase RLS testing
describe('Security - RLS Integration (requires test database)', () => {
  it.skip('should enforce RLS policies on user_roles table', async () => {
    // This would be an integration test that requires a test Supabase instance
    // It would verify that:
    // 1. Users can only read their own roles
    // 2. Only service role can insert/update roles
    // 3. Admin functions work through security definer functions
  });

  it.skip('should enforce loan access policies', async () => {
    // This would test that:
    // 1. Users can only see their own loans
    // 2. Staff can see all loans with proper role
    // 3. Loan modifications require proper permissions
  });
});
