import { describe, expect, it } from 'vitest';
import { consumePendingInvite, peekPendingInvite, persistPendingInvite } from '@/lib/pendingInvite';

describe('pendingInvite sessionStorage', () => {
  it('persists, peeks, and consumes a token without using next=', () => {
    persistPendingInvite('  abc123  ');
    expect(peekPendingInvite()).toBe('abc123');
    expect(consumePendingInvite()).toBe('abc123');
    expect(peekPendingInvite()).toBeNull();
  });

  it('ignores empty tokens', () => {
    persistPendingInvite('   ');
    expect(peekPendingInvite()).toBeNull();
  });
});
