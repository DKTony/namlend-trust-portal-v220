/**
 * Where an identity belongs in the app, in one place.
 *
 * The app has two identity planes that are never unioned (see docs: Users, Roles & Access):
 *   • tenant   — `userRoles`:      client | loan_officer | admin | tenant_admin
 *   • platform — `platformAdmins`: platform_owner | platform_support
 *
 * and three consoles: `/dashboard` (client), `/admin` (backoffice), `/platform` (control plane).
 * Every redirect that has to pick one of those three routes through `getLandingRoute` so the
 * mapping can't drift between the login page, the route guards and the shells.
 */

/** The three console roots. */
export type LandingRoute = '/platform' | '/admin' | '/dashboard';

/**
 * The access-relevant slice of the auth context.
 *
 * `isLoanOfficer` is already true for `admin` and `tenant_admin` (see `useAuth`), so it reads
 * as "tenant staff" — the same widening the `/admin` route guard uses.
 */
export interface RoleFlags {
  isPlatformStaff: boolean;
  isLoanOfficer: boolean;
}

/**
 * The console this identity lands in.
 *
 * Platform wins over tenant: a platform identity is a separate plane, and the common case is a
 * pure `platform_owner` whose tenant role is `client` — landing them on `/dashboard` would hide
 * the console they signed in for. Dual-role users can still reach `/admin` from the nav.
 */
export function getLandingRoute(flags: RoleFlags): LandingRoute {
  if (flags.isPlatformStaff) return '/platform';
  if (flags.isLoanOfficer) return '/admin';
  return '/dashboard';
}

/** Human label for the landing route, for nav buttons that link to "my console". */
export function getLandingLabel(flags: RoleFlags): string {
  switch (getLandingRoute(flags)) {
    case '/platform':
      return 'Platform Console';
    case '/admin':
      return 'Admin Dashboard';
    default:
      return 'Dashboard';
  }
}

/**
 * Narrow an untrusted redirect target to an internal path, or null.
 *
 * Guards against open redirects: `//evil.com` (protocol-relative), `https://evil.com`,
 * `javascript:…`, and anything not rooted at `/`. Applied on both sides — when the guard
 * *writes* `?next=` and when the auth page *reads* it back — because the query string is
 * user-controlled in between.
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const path = raw.trim();
  if (!path.startsWith('/')) return null; // must be root-relative
  if (path.startsWith('//')) return null; // protocol-relative → external host
  if (path.includes('://')) return null; // absolute URL smuggled into the path
  // eslint-disable-next-line no-control-regex -- control chars can hide a scheme from the checks above
  if (/[\x00-\x1f\x7f]/.test(path)) return null;

  // Never bounce back to the auth page itself; that is how redirect loops start.
  const [pathname] = path.split(/[?#]/);
  if (pathname === '/auth') return null;

  return path;
}

/**
 * Whether `flags` may open `path`.
 *
 * Mirrors the guards mounted in `App.tsx` — `/platform/*` needs platform staff, `/admin/*` needs
 * tenant staff, everything else only needs a session. Sub-sections of `/admin` that additionally
 * require `requireAdmin` are intentionally not modelled here: this answers "should we send them
 * there at all", and `ProtectedRoute` remains the enforcement point.
 */
export function canAccessPath(path: string, flags: RoleFlags): boolean {
  const [pathname] = path.split(/[?#]/);

  if (pathname === '/platform' || pathname.startsWith('/platform/')) {
    return flags.isPlatformStaff;
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return flags.isLoanOfficer;
  }
  return true;
}

/**
 * The post-login destination: the requested `next` when the user can actually open it,
 * otherwise their own console. Keeps a client who was bounced off `/admin/approvals` from
 * being sent straight back into an "Access Denied" dead end.
 */
export function resolvePostLoginRoute(next: string | null | undefined, flags: RoleFlags): string {
  const safeNext = sanitizeNextPath(next);
  if (safeNext && canAccessPath(safeNext, flags)) return safeNext;
  return getLandingRoute(flags);
}

/**
 * One-shot marker that the session ended because the user chose to sign out, rather than
 * because a guard interrupted them. Set by `useAuth().signOut`, read (and cleared) by
 * `buildAuthRedirect`.
 *
 * Module state rather than a React value because the two sides live in different trees:
 * `AuthProvider` sits above `<Router>`, the guard below it. sessionStorage-backed so it
 * survives the remount the auth-state change triggers.
 */
const DELIBERATE_SIGN_OUT_KEY = 'namlend:deliberate-signout';

export function markDeliberateSignOut(): void {
  try {
    sessionStorage.setItem(DELIBERATE_SIGN_OUT_KEY, '1');
  } catch {
    // Private mode / storage disabled — worst case we keep the old `?next=` behaviour.
  }
}

function consumeDeliberateSignOut(): boolean {
  try {
    if (sessionStorage.getItem(DELIBERATE_SIGN_OUT_KEY) === null) return false;
    sessionStorage.removeItem(DELIBERATE_SIGN_OUT_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the `/auth?next=…` URL a guard redirects to, preserving the full location (query and
 * hash included) so deep links survive the round trip.
 *
 * Returns a bare `/auth` after a deliberate sign-out: `?next=` promises "we'll resume where
 * you were", which is wrong for someone who chose to leave — and because the parameter is
 * consumed by whoever signs in NEXT, it sent an admin to the previous client's dashboard on
 * a shared device.
 */
export function buildAuthRedirect(location: {
  pathname: string;
  search?: string;
  hash?: string;
}): string {
  if (consumeDeliberateSignOut()) return '/auth';
  const full = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`;
  const safe = sanitizeNextPath(full);
  return safe ? `/auth?next=${encodeURIComponent(safe)}` : '/auth';
}
