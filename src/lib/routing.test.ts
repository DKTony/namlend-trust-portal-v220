import { describe, expect, it } from 'vitest';
import {
  buildAuthRedirect,
  canAccessPath,
  getLandingLabel,
  getLandingRoute,
  resolvePostLoginRoute,
  sanitizeNextPath,
  type RoleFlags,
} from './routing';

const CLIENT: RoleFlags = { isPlatformStaff: false, isLoanOfficer: false };
const STAFF: RoleFlags = { isPlatformStaff: false, isLoanOfficer: true };
const PLATFORM: RoleFlags = { isPlatformStaff: true, isLoanOfficer: false };
const DUAL: RoleFlags = { isPlatformStaff: true, isLoanOfficer: true };

describe('getLandingRoute', () => {
  it('sends a client to the client dashboard', () => {
    expect(getLandingRoute(CLIENT)).toBe('/dashboard');
  });

  it('sends tenant staff to the backoffice', () => {
    expect(getLandingRoute(STAFF)).toBe('/admin');
  });

  it('sends a pure platform owner to the platform console, not /dashboard', () => {
    // Notion Users, Roles & Access: platform_owner lands on /platform even when the
    // tenant role stays `client`. Disposable E2E uses platformowner@test.namlend.com
    // — not Notion's aromatic-okapi-265 owner@namlend.test password.
    expect(getLandingRoute(PLATFORM)).toBe('/platform');
  });

  it('gives the platform plane precedence for a dual-role identity', () => {
    expect(getLandingRoute(DUAL)).toBe('/platform');
  });
});

describe('getLandingLabel', () => {
  it('names each console', () => {
    expect(getLandingLabel(CLIENT)).toBe('Dashboard');
    expect(getLandingLabel(STAFF)).toBe('Admin Dashboard');
    expect(getLandingLabel(PLATFORM)).toBe('Platform Console');
  });
});

describe('sanitizeNextPath', () => {
  it('keeps internal paths, including query and hash', () => {
    expect(sanitizeNextPath('/admin/approvals')).toBe('/admin/approvals');
    expect(sanitizeNextPath('/admin/loans?status=pending')).toBe('/admin/loans?status=pending');
    expect(sanitizeNextPath('/dashboard#loans')).toBe('/dashboard#loans');
  });

  it('rejects empty input', () => {
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath(undefined)).toBeNull();
    expect(sanitizeNextPath('')).toBeNull();
  });

  it('rejects protocol-relative and absolute URLs (open redirect)', () => {
    expect(sanitizeNextPath('//evil.com')).toBeNull();
    expect(sanitizeNextPath('//evil.com/admin')).toBeNull();
    expect(sanitizeNextPath('https://evil.com')).toBeNull();
    expect(sanitizeNextPath('/redirect?to=https://evil.com')).toBeNull();
  });

  it('rejects non-rooted paths and pseudo-schemes', () => {
    expect(sanitizeNextPath('admin')).toBeNull();
    expect(sanitizeNextPath('javascript:alert(1)')).toBeNull();
  });

  it('rejects control characters used to hide a scheme', () => {
    expect(sanitizeNextPath('/\n/evil.com')).toBeNull();
    expect(sanitizeNextPath('/\tadmin')).toBeNull();
    expect(sanitizeNextPath('/admin\u0000')).toBeNull();
  });

  it('refuses to bounce back to /auth, which is how redirect loops start', () => {
    expect(sanitizeNextPath('/auth')).toBeNull();
    expect(sanitizeNextPath('/auth?next=%2Fadmin')).toBeNull();
  });
});

describe('canAccessPath', () => {
  it('gates /platform on platform staff', () => {
    expect(canAccessPath('/platform', PLATFORM)).toBe(true);
    expect(canAccessPath('/platform/tenants', PLATFORM)).toBe(true);
    expect(canAccessPath('/platform/tenants', STAFF)).toBe(false);
    expect(canAccessPath('/platform', CLIENT)).toBe(false);
  });

  it('gates /admin on tenant staff', () => {
    expect(canAccessPath('/admin/approvals', STAFF)).toBe(true);
    expect(canAccessPath('/admin/approvals', CLIENT)).toBe(false);
    expect(canAccessPath('/admin', CLIENT)).toBe(false);
  });

  it('does not treat lookalike prefixes as protected', () => {
    expect(canAccessPath('/administration', CLIENT)).toBe(true);
    expect(canAccessPath('/platformer', CLIENT)).toBe(true);
  });

  it('allows shared authenticated routes for everyone', () => {
    expect(canAccessPath('/dashboard', CLIENT)).toBe(true);
    expect(canAccessPath('/loans/abc123', CLIENT)).toBe(true);
  });

  it('ignores query and hash when checking the prefix', () => {
    expect(canAccessPath('/admin/loans?status=pending', CLIENT)).toBe(false);
    expect(canAccessPath('/admin/loans?status=pending', STAFF)).toBe(true);
  });
});

describe('resolvePostLoginRoute', () => {
  it('honours a next the user can actually open', () => {
    expect(resolvePostLoginRoute('/admin/approvals', STAFF)).toBe('/admin/approvals');
    expect(resolvePostLoginRoute('/admin/loans?status=pending', STAFF)).toBe(
      '/admin/loans?status=pending'
    );
  });

  it('falls back to the user home instead of a dead-end Access Denied', () => {
    expect(resolvePostLoginRoute('/admin/approvals', CLIENT)).toBe('/dashboard');
    expect(resolvePostLoginRoute('/platform/tenants', STAFF)).toBe('/admin');
  });

  it('falls back to the user home for an unsafe next', () => {
    expect(resolvePostLoginRoute('//evil.com', CLIENT)).toBe('/dashboard');
    expect(resolvePostLoginRoute('https://evil.com', PLATFORM)).toBe('/platform');
  });

  it('lands each role on its own console when no next is given', () => {
    expect(resolvePostLoginRoute(null, CLIENT)).toBe('/dashboard');
    expect(resolvePostLoginRoute(null, STAFF)).toBe('/admin');
    expect(resolvePostLoginRoute(null, PLATFORM)).toBe('/platform');
  });
});

describe('buildAuthRedirect', () => {
  it('preserves the full location so deep links survive the round trip', () => {
    expect(buildAuthRedirect({ pathname: '/admin/approvals' })).toBe(
      '/auth?next=%2Fadmin%2Fapprovals'
    );
    expect(buildAuthRedirect({ pathname: '/admin/loans', search: '?status=pending' })).toBe(
      '/auth?next=%2Fadmin%2Floans%3Fstatus%3Dpending'
    );
    expect(buildAuthRedirect({ pathname: '/dashboard', hash: '#loans' })).toBe(
      '/auth?next=%2Fdashboard%23loans'
    );
  });

  it('round-trips through sanitizeNextPath', () => {
    const url = buildAuthRedirect({ pathname: '/admin/loans', search: '?status=pending' });
    const next = new URLSearchParams(url.split('?').slice(1).join('?')).get('next');
    expect(sanitizeNextPath(next)).toBe('/admin/loans?status=pending');
  });

  it('drops an unusable location rather than emitting a bad next', () => {
    expect(buildAuthRedirect({ pathname: '//evil.com' })).toBe('/auth');
    expect(buildAuthRedirect({ pathname: '/auth' })).toBe('/auth');
  });
});
