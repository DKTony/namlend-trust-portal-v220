'use node';
/**
 * Send SMS Action — Africa's Talking gateway.
 * Replaces the send-sms Supabase edge function.
 *
 * Convex Actions can call external APIs and have no time limit.
 */

import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';

const AT_API_URL = 'https://api.africastalking.com/version1/messaging';
const AT_SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging';

const API_KEY = process.env.AFRICASTALKING_API_KEY ?? '';
const USERNAME = process.env.AFRICASTALKING_USERNAME ?? 'sandbox';
const SENDER_ID = process.env.SMS_SENDER_ID ?? 'OGFIN';
const IS_SANDBOX = process.env.AFRICASTALKING_SANDBOX === 'true';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SMSCategory =
  | 'loan_notification'
  | 'payment_reminder'
  | 'payment_confirmation'
  | 'otp'
  | 'marketing'
  | 'collections';

interface ATRecipient {
  number: string;
  status: string;
  messageId?: string;
  cost?: string;
}

type SmsSendResult = {
  success: boolean;
  error?: string;
  recipients?: ATRecipient[];
};

// ---------------------------------------------------------------------------
// Phone number utilities (ported from smsGateway.ts)
// ---------------------------------------------------------------------------

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '264' + cleaned.substring(1);
  } else if (!cleaned.startsWith('264') && cleaned.length === 9) {
    cleaned = '264' + cleaned;
  }
  return '+' + cleaned;
}

function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  return /^\+264[0-9]{9}$/.test(formatted);
}

// ---------------------------------------------------------------------------
// SMS Templates (ported from smsGateway.ts)
// ---------------------------------------------------------------------------

const SMS_TEMPLATES: Record<
  string,
  { category: SMSCategory; template: string; variables: string[] }
> = {
  LOAN_SUBMITTED: {
    category: 'loan_notification',
    template:
      "Hi {firstName}, your loan application for {amount} has been submitted. Ref: {reference}. We'll review it within 24hrs. - OG Financial",
    variables: ['firstName', 'amount', 'reference'],
  },
  LOAN_APPROVED: {
    category: 'loan_notification',
    template:
      'Great news {firstName}! Your loan of {amount} has been approved. Funds will be disbursed within 24hrs. Ref: {reference} - OG Financial',
    variables: ['firstName', 'amount', 'reference'],
  },
  LOAN_REJECTED: {
    category: 'loan_notification',
    template:
      'Hi {firstName}, unfortunately your loan application was not approved. Please contact us for more info. Ref: {reference} - OG Financial',
    variables: ['firstName', 'reference'],
  },
  LOAN_DISBURSED: {
    category: 'loan_notification',
    template:
      'Hi {firstName}, {amount} has been disbursed to your account. First payment of {monthlyPayment} due on {dueDate}. - OG Financial',
    variables: ['firstName', 'amount', 'monthlyPayment', 'dueDate'],
  },
  PAYMENT_REMINDER_7_DAYS: {
    category: 'payment_reminder',
    template:
      'Reminder: Your loan payment of {amount} is due in 7 days ({dueDate}). Ref: {reference}. Pay via *140# or bank transfer. - OG Financial',
    variables: ['amount', 'dueDate', 'reference'],
  },
  PAYMENT_REMINDER_3_DAYS: {
    category: 'payment_reminder',
    template:
      'Reminder: Your loan payment of {amount} is due in 3 days ({dueDate}). Avoid late fees - pay now! Ref: {reference} - OG Financial',
    variables: ['amount', 'dueDate', 'reference'],
  },
  PAYMENT_REMINDER_1_DAY: {
    category: 'payment_reminder',
    template:
      'URGENT: Your loan payment of {amount} is due tomorrow ({dueDate}). Pay now to avoid late fees. Ref: {reference} - OG Financial',
    variables: ['amount', 'dueDate', 'reference'],
  },
  PAYMENT_OVERDUE: {
    category: 'collections',
    template:
      'OVERDUE: Your payment of {amount} was due on {dueDate}. Please pay immediately to avoid additional charges. Call us: +264 81 417 4288 - OG Financial',
    variables: ['amount', 'dueDate'],
  },
  PAYMENT_RECEIVED: {
    category: 'payment_confirmation',
    template:
      'Payment received! {amount} paid on {date}. Remaining balance: {balance}. Ref: {reference}. Thank you! - OG Financial',
    variables: ['amount', 'date', 'balance', 'reference'],
  },
  LOAN_COMPLETED: {
    category: 'loan_notification',
    template:
      'Congratulations {firstName}! Your loan has been fully repaid. Thank you for choosing OG Financial. Apply again anytime! - OG Financial',
    variables: ['firstName'],
  },
  OTP_VERIFICATION: {
    category: 'otp',
    template:
      'Your OG Financial verification code is: {otp}. Valid for 10 minutes. Never share this code.',
    variables: ['otp'],
  },
  PTP_REMINDER: {
    category: 'collections',
    template:
      'Hi {firstName}, reminder: You promised to pay {amount} today ({date}). Please fulfill your commitment. Ref: {reference} - OG Financial',
    variables: ['firstName', 'amount', 'date', 'reference'],
  },
};

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return rendered;
}

// ---------------------------------------------------------------------------
// Core send action
// ---------------------------------------------------------------------------

export const sendSms = internalAction({
  args: {
    to: v.array(v.string()),
    message: v.string(),
    category: v.string(),
    userId: v.optional(v.id('users')),
    loanId: v.optional(v.id('loans')),
    templateCode: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<SmsSendResult> => {
    const validRecipients = args.to.filter(isValidPhoneNumber).map(formatPhoneNumber);

    if (validRecipients.length === 0) {
      console.warn('[sendSms] No valid phone numbers');
      return { success: false, error: 'No valid phone numbers' };
    }

    const segments = Math.ceil(args.message.length / 153);
    const apiUrl = IS_SANDBOX ? AT_SANDBOX_URL : AT_API_URL;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          apiKey: API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          username: USERNAME,
          to: validRecipients.join(','),
          message: args.message,
          from: SENDER_ID,
        }),
      });

      const data = await response.json();
      const atRecipients: ATRecipient[] = data?.SMSMessageData?.Recipients ?? [];

      // Log each send to communication_logs via notification records
      for (const recipient of atRecipients) {
        if (args.userId) {
          await ctx.runMutation(internal.notifications.createNotification, {
            userId: args.userId,
            title: `SMS sent (${args.category})`,
            message: args.message.substring(0, 100),
            category: 'general',
            priority: 'low',
            metadata: {
              channel: 'sms',
              recipient: recipient.number,
              status: recipient.status,
              messageId: recipient.messageId,
              segments,
              templateCode: args.templateCode,
            },
          });
        }
      }

      console.log(`[sendSms] Sent to ${atRecipients.length} recipients`);
      return { success: true, recipients: atRecipients };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      console.error('[sendSms] Error:', msg);
      return { success: false, error: msg };
    }
  },
});

/**
 * Send an SMS using a pre-defined template.
 */
export const sendTemplateSms = internalAction({
  args: {
    templateCode: v.string(),
    to: v.array(v.string()),
    variables: v.record(v.string(), v.string()),
    userId: v.optional(v.id('users')),
    loanId: v.optional(v.id('loans')),
  },
  handler: async (ctx, args): Promise<SmsSendResult> => {
    const tmpl = SMS_TEMPLATES[args.templateCode];
    if (!tmpl) {
      console.error(`[sendTemplateSms] Unknown template: ${args.templateCode}`);
      return { success: false, error: `Unknown template: ${args.templateCode}` };
    }

    const missing = tmpl.variables.filter((v) => !args.variables[v]);
    if (missing.length > 0) {
      return { success: false, error: `Missing variables: ${missing.join(', ')}` };
    }

    const message = renderTemplate(tmpl.template, args.variables);

    return ctx.runAction(internal.actions.sendSms.sendSms, {
      to: args.to,
      message,
      category: tmpl.category,
      userId: args.userId,
      loanId: args.loanId,
      templateCode: args.templateCode,
    });
  },
});
