import { describe, expect, it } from 'vitest';
import {
  hashInviteToken,
  mintInviteToken,
  normalizeInviteEmail,
} from '../../convex/lib/inviteToken';

describe('invite token helpers', () => {
  it('normalizes email case and rejects junk', () => {
    expect(normalizeInviteEmail('  Foo@Example.COM ')).toBe('foo@example.com');
    expect(normalizeInviteEmail('not-an-email')).toBeNull();
    expect(normalizeInviteEmail('')).toBeNull();
  });

  it('hashes tokens with SHA-256 and never equals the raw secret', async () => {
    const token = mintInviteToken();
    expect(token).toHaveLength(64);
    const hash = await hashInviteToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(token);
    expect(await hashInviteToken(token)).toBe(hash);
  });
});
