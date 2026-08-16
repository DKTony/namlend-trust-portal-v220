'use node';
/**
 * Deliver a tenant invite email via Resend.
 *
 * The raw token is an argument so it can be placed in the link once. Never log it.
 * When RESEND_API_KEY is unset the send is simulated (same posture as the
 * TigerBeetle worker) so local/E2E copy-link still works.
 */

import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';

const ROLE_LABEL: Record<'client' | 'loan_officer' | 'tenant_admin', string> = {
  client: 'client',
  loan_officer: 'loan officer',
  tenant_admin: 'tenant admin',
};

function inviteOrigin(): string {
  const raw = process.env.SITE_URL || process.env.CONVEX_SITE_URL || '';
  return raw.replace(/\/$/, '');
}

export const send = internalAction({
  args: {
    inviteId: v.id('tenantInvites'),
    token: v.string(),
    to: v.string(),
    intendedRole: v.union(
      v.literal('client'),
      v.literal('loan_officer'),
      v.literal('tenant_admin')
    ),
    tenantName: v.string(),
  },
  returns: v.object({
    simulated: v.boolean(),
    sent: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const origin = inviteOrigin();
    const link = `${origin}/auth?invite=${encodeURIComponent(args.token)}`;
    const roleLabel = ROLE_LABEL[args.intendedRole];
    const apiKey = process.env.RESEND_API_KEY ?? '';
    const from = process.env.INVITE_FROM_EMAIL ?? 'NamLend Trust <noreply@namlend.local>';

    if (!apiKey || !origin) {
      await ctx.runMutation(internal.invites.markInviteSent, {
        inviteId: args.inviteId,
        lastError: apiKey ? 'INVITE_ORIGIN_MISSING' : 'EMAIL_SIMULATED',
      });
      return { simulated: true, sent: false };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [args.to],
          subject: `You're invited to ${args.tenantName}`,
          text: [
            `You have been invited to join ${args.tenantName} as a ${roleLabel}.`,
            '',
            `Open this link to accept (expires in 72 hours):`,
            link,
            '',
            'If you were not expecting this email you can ignore it.',
          ].join('\n'),
        }),
      });

      if (!response.ok) {
        await ctx.runMutation(internal.invites.markInviteSent, {
          inviteId: args.inviteId,
          lastError: 'EMAIL_FAILED',
        });
        return { simulated: false, sent: false };
      }

      await ctx.runMutation(internal.invites.markInviteSent, {
        inviteId: args.inviteId,
        lastError: 'EMAIL_SENT',
      });
      return { simulated: false, sent: true };
    } catch {
      await ctx.runMutation(internal.invites.markInviteSent, {
        inviteId: args.inviteId,
        lastError: 'EMAIL_FAILED',
      });
      return { simulated: false, sent: false };
    }
  },
});
