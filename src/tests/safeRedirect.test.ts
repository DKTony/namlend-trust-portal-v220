/**
 * Open-redirect regression tests.
 *
 * Auth.tsx previously passed `?next=` straight to navigate() with no validation, so
 * `/auth?next=//evil.com` sent the user off-origin immediately after they authenticated.
 *
 * Run: npm run test:unit
 */
import { describe, expect, test } from 'vitest';
import { buildOAuthRedirect, DEFAULT_REDIRECT, sanitizeNextPath } from '@/utils/safeRedirect';

describe('sanitizeNextPath — allowed', () => {
  test.each(['/kyc', '/dashboard', '/loans/abc123', '/kyc?tab=documents', '/a%20b'])(
    'keeps %s',
    (path) => {
      expect(sanitizeNextPath(path)).toBe(path);
    }
  );
});

describe('sanitizeNextPath — rejected', () => {
  test.each([
    ['protocol-relative', '//evil.com'],
    ['backslash protocol-relative', '/\\evil.com'],
    ['absolute https', 'https://evil.com'],
    ['absolute http', 'http://evil.com'],
    ['scheme buried in a path', '/redirect?to=https://evil.com'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['bare word', 'dashboard'],
    ['embedded newline', '/kyc\nSet-Cookie: x=1'],
    ['embedded CR', '/kyc\r\nLocation: https://evil.com'],
    ['null byte', '/kyc\0'],
  ])('%s falls back', (_label, path) => {
    expect(sanitizeNextPath(path)).toBe(DEFAULT_REDIRECT);
  });

  test.each([null, undefined, ''])('empty value %s falls back', (value) => {
    expect(sanitizeNextPath(value)).toBe(DEFAULT_REDIRECT);
  });

  test('honours a custom fallback', () => {
    expect(sanitizeNextPath('//evil.com', '/admin')).toBe('/admin');
  });
});

describe('buildOAuthRedirect', () => {
  // `oauth=return` is the failure sentinel: the OAuth callback redirects back with no
  // error signal on failure, so every attempt must carry the marker for Auth.tsx to
  // distinguish a failed handshake from a plain /auth visit.
  test('anchors to the caller origin and routes back through /auth with the sentinel', () => {
    expect(buildOAuthRedirect('http://localhost:8080', '/kyc')).toBe(
      'http://localhost:8080/auth?oauth=return&next=%2Fkyc'
    );
  });

  test('sanitises a hostile next before embedding it', () => {
    expect(buildOAuthRedirect('https://app.example.com', '//evil.com')).toBe(
      'https://app.example.com/auth?oauth=return&next=%2Fdashboard'
    );
  });

  test('defaults when next is absent', () => {
    expect(buildOAuthRedirect('http://localhost:8080')).toBe(
      'http://localhost:8080/auth?oauth=return&next=%2Fdashboard'
    );
  });
});
