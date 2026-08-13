import { describe, expect, it } from 'vitest';

/**
 * Keep the Playwright login helper's toast matcher aligned with Auth.tsx / useAuth
 * copy. A hang (no toast) vs InvalidAccountId vs InvalidSecret must be distinguishable
 * in CI logs — the previous helper collapsed all three into "ensure seeded".
 *
 * Must stay in sync with AUTH_FAILURE_TOAST in e2e/helpers/auth.ts.
 */
const AUTH_FAILURE_TOAST =
  /login failed|no account found|incorrect password|login error|invalid credentials|invalid_email|session timeout/i;

describe('E2E login helper vs Auth.tsx copy', () => {
  it('matches Login Failed, No account found, Incorrect password, and Login Error', () => {
    expect(AUTH_FAILURE_TOAST.test('Login Failed')).toBe(true);
    expect(AUTH_FAILURE_TOAST.test('No account found with this email. Please sign up first.')).toBe(
      true
    );
    expect(AUTH_FAILURE_TOAST.test('Incorrect password. Please try again.')).toBe(true);
    expect(AUTH_FAILURE_TOAST.test('Login Error')).toBe(true);
  });

  it('does not treat a silent /auth hang as a toast match', () => {
    expect(AUTH_FAILURE_TOAST.test('')).toBe(false);
    expect(AUTH_FAILURE_TOAST.test('Welcome back!')).toBe(false);
  });
});
