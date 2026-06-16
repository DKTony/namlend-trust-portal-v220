'use node';
/**
 * Send WhatsApp Action — Meta Cloud API.
 * Replaces the send-whatsapp Supabase edge function.
 *
 * WhatsApp Business API requires pre-approved templates for outbound messages.
 * Template names must be registered in Meta Business Manager.
 */

import { v } from 'convex/values';
import { internalAction } from '../_generated/server';

const WA_API_VERSION = 'v19.0';
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? '';
const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`;

// ---------------------------------------------------------------------------
// Template definitions — must match registered Meta templates exactly
// ---------------------------------------------------------------------------

const WA_TEMPLATES: Record<
  string,
  {
    name: string;
    language: string;
    components: (variables: Record<string, string>) => Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }>;
  }
> = {
  LOAN_APPROVED: {
    name: 'loan_approved',
    language: 'en',
    components: (vars) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: vars.firstName },
          { type: 'text', text: vars.amount },
          { type: 'text', text: vars.reference },
        ],
      },
    ],
  },
  LOAN_DISBURSED: {
    name: 'loan_disbursed',
    language: 'en',
    components: (vars) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: vars.firstName },
          { type: 'text', text: vars.amount },
          { type: 'text', text: vars.dueDate },
        ],
      },
    ],
  },
  PAYMENT_REMINDER: {
    name: 'payment_reminder',
    language: 'en',
    components: (vars) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: vars.amount },
          { type: 'text', text: vars.dueDate },
          { type: 'text', text: vars.reference },
        ],
      },
    ],
  },
  PAYMENT_RECEIVED: {
    name: 'payment_received',
    language: 'en',
    components: (vars) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: vars.amount },
          { type: 'text', text: vars.balance },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Send WhatsApp template message
// ---------------------------------------------------------------------------

export const sendWhatsappTemplate = internalAction({
  args: {
    to: v.string(),
    templateCode: v.string(),
    variables: v.record(v.string(), v.string()),
    userId: v.optional(v.id('users')),
    loanId: v.optional(v.id('loans')),
  },
  handler: async (_ctx, args) => {
    const tmpl = WA_TEMPLATES[args.templateCode];
    if (!tmpl) {
      console.error(`[sendWhatsapp] Unknown template: ${args.templateCode}`);
      return { success: false, error: `Unknown template: ${args.templateCode}` };
    }

    if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
      console.warn('[sendWhatsapp] WhatsApp credentials not configured');
      return { success: false, error: 'WhatsApp not configured' };
    }

    // Normalize Namibian phone number for WhatsApp (no leading +)
    const to = args.to.replace(/\D/g, '').startsWith('264')
      ? args.to.replace(/\D/g, '')
      : '264' + args.to.replace(/^0/, '').replace(/\D/g, '');

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: tmpl.name,
        language: { code: tmpl.language },
        components: tmpl.components(args.variables),
      },
    };

    try {
      const response = await fetch(WA_BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[sendWhatsapp] API error:', data);
        return { success: false, error: data?.error?.message ?? 'WhatsApp API error' };
      }

      console.log(`[sendWhatsapp] Sent ${args.templateCode} to ${to}`);
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      console.error('[sendWhatsapp] Error:', msg);
      return { success: false, error: msg };
    }
  },
});

/**
 * Send a free-form WhatsApp text message.
 * Only allowed within 24h of a user-initiated conversation.
 */
export const sendWhatsappText = internalAction({
  args: {
    to: v.string(),
    text: v.string(),
    userId: v.optional(v.id('users')),
  },
  handler: async (_ctx, args) => {
    if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const to = args.to.replace(/\D/g, '').startsWith('264')
      ? args.to.replace(/\D/g, '')
      : '264' + args.to.replace(/^0/, '').replace(/\D/g, '');

    try {
      const response = await fetch(WA_BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: args.text },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data?.error?.message ?? 'WhatsApp API error' };
      }
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: msg };
    }
  },
});
