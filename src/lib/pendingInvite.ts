/**
 * Carry an invite token across the Google OAuth hop without putting it in `?next=`.
 * Same sessionStorage pattern as deliberate sign-out in `routing.ts`.
 */

const PENDING_INVITE_KEY = 'namlend:pendingInvite';

export function persistPendingInvite(token: string): void {
  const trimmed = token.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, trimmed);
  } catch {
    // Private mode — redeem will fail closed if the token is lost.
  }
}

export function peekPendingInvite(): string | null {
  try {
    return sessionStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}

export function consumePendingInvite(): string | null {
  try {
    const token = sessionStorage.getItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    return token;
  } catch {
    return null;
  }
}
