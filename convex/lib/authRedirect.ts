/**
 * Post-OAuth redirect resolution.
 *
 * One Convex deployment serves more than one browser origin (the Netlify site and
 * local dev both talk to the same backend), but `SITE_URL` holds a single value. So
 * `redirectTo` has to be validated against an explicit allowlist rather than the
 * library's default, which only accepts relative paths or a `startsWith(SITE_URL)`
 * prefix match — and that prefix match would happily accept
 * `https://namlend-trust-portal-v220.netlify.app.evil.com`.
 *
 * TWO HARD CONSTRAINTS, both from reading the library:
 *
 *  1. NEVER THROW. `callbackAction` computes the destination OUTSIDE its try block and
 *     is not wrapped in `convertErrorsToResponse`, so a throw here is a bare HTTP 500
 *     in the middle of the OAuth handshake. Reject by falling back, not by throwing.
 *  2. ALWAYS RETURN AN ABSOLUTE URL. The result is fed to `setURLSearchParam`, which
 *     does `absoluteUrl.match(/([^:]+):(.*)/)` and dereferences the result. A bare
 *     path has no colon, `match` returns null, and you get a TypeError.
 */

/**
 * Origins a post-OAuth redirect may land on. `SITE_URL` is always allowed; additional
 * origins come from `ALLOWED_REDIRECT_ORIGINS` (comma-separated) so the shared
 * deployment can serve both production and localhost.
 */
export function allowedOrigins(env: Record<string, string | undefined> = process.env): string[] {
  const strip = (s: string) => s.trim().replace(/\/$/, '');
  const site = env.SITE_URL ? strip(env.SITE_URL) : undefined;
  const extra = (env.ALLOWED_REDIRECT_ORIGINS ?? '').split(',').map(strip).filter(Boolean);
  return [...new Set([...(site ? [site] : []), ...extra])];
}

/**
 * Resolve `redirectTo` to an absolute URL on an allowed origin, falling back to the
 * first allowed origin for anything unrecognised. Total function — never throws.
 */
export function resolveRedirect(redirectTo: string, origins: string[]): string {
  const fallback = origins[0] ?? 'http://localhost:8080';
  if (typeof redirectTo !== 'string' || redirectTo === '') return fallback;

  // Relative destinations resolve against the default origin.
  if (redirectTo.startsWith('?')) return `${fallback}${redirectTo}`;
  if (
    redirectTo.startsWith('/') &&
    !redirectTo.startsWith('//') && // protocol-relative → off-origin
    !redirectTo.startsWith('/\\') // backslash variant browsers also treat as //
  ) {
    return `${fallback}${redirectTo}`;
  }

  try {
    const url = new URL(redirectTo);
    // Plaintext http is only tolerated for local development.
    const schemeOk =
      url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost');
    // Exact origin equality, deliberately NOT startsWith.
    if (schemeOk && origins.includes(url.origin)) return url.toString();
  } catch {
    // Not a parseable URL — fall through.
  }

  console.warn('[auth] rejected redirectTo, falling back to the default origin');
  return fallback;
}
