/**
 * Invite token minting and hashing.
 *
 * Email tokens live for 72 hours, so they are hashed at rest (unlike 5-minute
 * document-grant nonces, which are stored plaintext by design).
 */

export const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
export const INVITE_RATE_LIMIT_PER_HOUR = 20;
export const TENANT_INVITES_RULE = 'TENANT_INVITES';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInviteEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) return null;
  return email;
}

export function mintInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
