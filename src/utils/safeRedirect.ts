/**
 * Validation for the `?next=` parameter used to bounce users back to where they were
 * headed before authenticating.
 *
 * `ProtectedRoute` validated this when *writing* the param, but `Auth.tsx` fed it
 * straight to `navigate()` when reading it — so a hand-crafted `/auth?next=//evil.com`
 * left the origin after login. This is the single shared rule for both sides.
 *
 * NOTE: react-router's `useSearchParams` has already decoded the value, so callers
 * must not `decodeURIComponent` again — a literal `%` in the path would throw.
 */

export const DEFAULT_REDIRECT = '/dashboard';

/**
 * Return `raw` if it is a safe in-app path, otherwise `fallback`.
 *
 * Only same-origin absolute paths are allowed. Everything that could leave the origin
 * is rejected: protocol-relative `//host`, the `/\host` variant browsers normalise to
 * it, anything containing a scheme, and control characters that could be used to
 * smuggle a newline past a naive check.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT
): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.startsWith('/\\')) return fallback;
  if (raw.includes('://')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}

/**
 * Build an absolute `redirectTo` for OAuth sign-in, anchored to the origin the user is
 * actually on. Passing the live origin is what lets one Convex deployment serve both
 * the Netlify site and localhost — the backend allowlist then vets it.
 */
export function buildOAuthRedirect(origin: string, next?: string | null): string {
  const path = sanitizeNextPath(next, DEFAULT_REDIRECT);
  // Land back on /auth so its existing role-aware routing runs (staff → /admin),
  // rather than duplicating that decision here.
  //
  // `oauth=return` is a sentinel, not state: Convex Auth's callback handler catches
  // ANY server-side failure (including a blocked account link) by redirecting here
  // with no session and no `?code=` — indistinguishable from a plain visit without
  // this marker. Auth.tsx uses it to tell "the handshake came back empty-handed"
  // apart from "the user just opened /auth".
  return `${origin}/auth?oauth=return&next=${encodeURIComponent(path)}`;
}
