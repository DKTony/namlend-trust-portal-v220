/**
 * SMS Gateway Service
 * Handles SMS messaging through Africa's Talking API
 * Supports: Transactional SMS, Bulk SMS, SMS Templates
 */

import { supabase } from '@/integrations/supabase/client';

// SMS Provider Configuration
const SMS_CONFIG = {
  apiKey: import.meta.env.VITE_AFRICASTALKING_API_KEY || '',
  username: import.meta.env.VITE_AFRICASTALKING_USERNAME || 'sandbox',
  senderId: import.meta.env.VITE_SMS_SENDER_ID || 'NAMLEND',
  apiUrl: 'https://api.africastalking.com/version1/messaging',
  sandboxUrl: 'https://api.sandbox.africastalking.com/version1/messaging'
};

export type SMSStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'rejected';

export type SMSCategory = 
  | 'loan_notification'
  | 'payment_reminder'
  | 'payment_confirmation'
  | 'otp'
  | 'marketing'
  | 'collections';

export interface SMSRequest {
  to: string | string[];
  message: string;
  category: SMSCategory;
  userId?: string;
  loanId?: string;
  metadata?: Record<string, unknown>;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  status: SMSStatus;
  message: string;
  cost?: number;
  recipients?: Array<{
    number: string;
    status: SMSStatus;
    messageId?: string;
    cost?: number;
  }>;
}

export interface SMSTemplate {
  code: string;
  category: SMSCategory;
  template: string;
  variables: string[];
}

// Pre-defined SMS Templates
const SMS_TEMPLATES: Record<string, SMSTemplate> = {
  LOAN_SUBMITTED: {
    code: 'LOAN_SUBMITTED',
    category: 'loan_notification',
    template: 'Hi {firstName}, your loan application for {amount} has been submitted. Ref: {reference}. We\'ll review it within 24hrs. - NamLend',
    variables: ['firstName', 'amount', 'reference']
  },
  LOAN_APPROVED: {
    code: 'LOAN_APPROVED',
    category: 'loan_notification',
    template: 'Great news {firstName}! Your loan of {amount} has been approved. Funds will be disbursed within 24hrs. Ref: {reference} - NamLend',
    variables: ['firstName', 'amount', 'reference']
  },
  LOAN_REJECTED: {
    code: 'LOAN_REJECTED',
    category: 'loan_notification',
    template: 'Hi {firstName}, unfortunately your loan application was not approved. Please contact us for more info. Ref: {reference} - NamLend',
    variables: ['firstName', 'reference']
  },
  LOAN_DISBURSED: {
    code: 'LOAN_DISBURSED',
    category: 'loan_notification',
    template: 'Hi {firstName}, {amount} has been disbursed to your account. First payment of {monthlyPayment} due on {dueDate}. - NamLend',
    variables: ['firstName', 'amount', 'monthlyPayment', 'dueDate']
  },
  PAYMENT_REMINDER_7_DAYS: {
    code: 'PAYMENT_REMINDER_7_DAYS',
    category: 'payment_reminder',
    template: 'Reminder: Your loan payment of {amount} is due in 7 days ({dueDate}). Ref: {reference}. Pay via *140# or bank transfer. - NamLend',
    variables: ['amount', 'dueDate', 'reference']
  },
  PAYMENT_REMINDER_3_DAYS: {
    code: 'PAYMENT_REMINDER_3_DAYS',
    category: 'payment_reminder',
    template: 'Reminder: Your loan payment of {amount} is due in 3 days ({dueDate}). Avoid late fees - pay now! Ref: {reference} - NamLend',
    variables: ['amount', 'dueDate', 'reference']
  },
  PAYMENT_REMINDER_1_DAY: {
    code: 'PAYMENT_REMINDER_1_DAY',
    category: 'payment_reminder',
    template: 'URGENT: Your loan payment of {amount} is due tomorrow ({dueDate}). Pay now to avoid late fees. Ref: {reference} - NamLend',
    variables: ['amount', 'dueDate', 'reference']
  },
  PAYMENT_OVERDUE: {
    code: 'PAYMENT_OVERDUE',
    category: 'collections',
    template: 'OVERDUE: Your payment of {amount} was due on {dueDate}. Please pay immediately to avoid additional charges. Call us: 061-123-4567 - NamLend',
    variables: ['amount', 'dueDate']
  },
  PAYMENT_RECEIVED: {
    code: 'PAYMENT_RECEIVED',
    category: 'payment_confirmation',
    template: 'Payment received! {amount} paid on {date}. Remaining balance: {balance}. Ref: {reference}. Thank you! - NamLend',
    variables: ['amount', 'date', 'balance', 'reference']
  },
  LOAN_COMPLETED: {
    code: 'LOAN_COMPLETED',
    category: 'loan_notification',
    template: 'Congratulations {firstName}! Your loan has been fully repaid. Thank you for choosing NamLend. Apply again anytime! - NamLend',
    variables: ['firstName']
  },
  OTP_VERIFICATION: {
    code: 'OTP_VERIFICATION',
    category: 'otp',
    template: 'Your NamLend verification code is: {otp}. Valid for 10 minutes. Never share this code.',
    variables: ['otp']
  },
  PTP_REMINDER: {
    code: 'PTP_REMINDER',
    category: 'collections',
    template: 'Hi {firstName}, reminder: You promised to pay {amount} today ({date}). Please fulfill your commitment. Ref: {reference} - NamLend',
    variables: ['firstName', 'amount', 'date', 'reference']
  }
};

/**
 * Format phone number to international format (+264...)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Namibian numbers
  if (cleaned.startsWith('0')) {
    cleaned = '264' + cleaned.substring(1);
  } else if (cleaned.startsWith('264')) {
    // Already in correct format
  } else if (cleaned.length === 9) {
    // Assume missing country code
    cleaned = '264' + cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Validate phone number format
 */
function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Namibian numbers: +264 followed by 9 digits
  return /^\+264[0-9]{9}$/.test(formatted);
}

/**
 * Render template with variables
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return rendered;
}

/**
 * Send SMS using Africa's Talking API
 * In production, this would call the actual API
 * For now, we log and store in database
 */
export async function sendSMS(request: SMSRequest): Promise<SMSResponse> {
  try {
    // Normalize recipients
    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    
    // Validate all phone numbers
    const validRecipients: string[] = [];
    const invalidRecipients: string[] = [];
    
    for (const phone of recipients) {
      if (isValidPhoneNumber(phone)) {
        validRecipients.push(formatPhoneNumber(phone));
      } else {
        invalidRecipients.push(phone);
      }
    }
    
    if (validRecipients.length === 0) {
      return {
        success: false,
        status: 'failed',
        message: 'No valid phone numbers provided'
      };
    }
    
    // Check message length (SMS limit is 160 chars, or 153 for concatenated)
    const messageLength = request.message.length;
    const segments = Math.ceil(messageLength / 153);
    
    // Log SMS to database (would be sent to API in production)
    const smsRecords = validRecipients.map(phone => ({
      recipient: phone,
      message: request.message,
      category: request.category,
      user_id: request.userId,
      loan_id: request.loanId,
      status: 'queued' as SMSStatus,
      segments,
      metadata: {
        ...request.metadata,
        invalid_numbers: invalidRecipients.length > 0 ? invalidRecipients : undefined
      },
      created_at: new Date().toISOString()
    }));
    
    // In production: Call Africa's Talking API
    // const response = await fetch(SMS_CONFIG.apiUrl, { ... });
    
    // Log to communication_logs for audit trail
    const messageIds = validRecipients.map(() => 
      `MSG-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    
    await supabase
      .from('communication_logs')
      .insert(validRecipients.map((phone, idx) => ({
        user_id: request.userId,
        loan_id: request.loanId,
        channel: 'sms',
        direction: 'outbound',
        recipient: phone,
        sender: SMS_CONFIG.senderId,
        content: request.message,
        template_code: (request.metadata as any)?.templateCode,
        status: 'sent',
        provider: 'africastalking',
        provider_message_id: messageIds[idx],
        segments,
        sent_at: new Date().toISOString(),
        metadata: request.metadata
      })));
    
    // Also queue for async processing
    await supabase
      .from('notification_queue')
      .insert(smsRecords.map(rec => ({
        user_id: rec.user_id,
        channel: 'sms',
        recipient: rec.recipient,
        subject: `SMS: ${rec.category}`,
        content: rec.message,
        status: 'sent',
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        metadata: rec.metadata
      })));
    
    return {
      success: true,
      messageId: `SMS-${Date.now()}`,
      status: 'queued',
      message: `SMS queued for ${validRecipients.length} recipient(s)`,
      recipients: validRecipients.map(phone => ({
        number: phone,
        status: 'queued',
        messageId: `MSG-${Date.now()}-${Math.random().toString(36).substring(7)}`
      }))
    };
  } catch (error: any) {
    console.error('SMS send error:', error);
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Failed to send SMS'
    };
  }
}

/**
 * Send SMS using a template
 */
export async function sendTemplateSMS(
  templateCode: string,
  to: string | string[],
  variables: Record<string, string>,
  options?: {
    userId?: string;
    loanId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<SMSResponse> {
  const template = SMS_TEMPLATES[templateCode];
  
  if (!template) {
    return {
      success: false,
      status: 'failed',
      message: `Template not found: ${templateCode}`
    };
  }
  
  // Check all required variables are provided
  const missingVars = template.variables.filter(v => !variables[v]);
  if (missingVars.length > 0) {
    return {
      success: false,
      status: 'failed',
      message: `Missing template variables: ${missingVars.join(', ')}`
    };
  }
  
  const message = renderTemplate(template.template, variables);
  
  return sendSMS({
    to,
    message,
    category: template.category,
    userId: options?.userId,
    loanId: options?.loanId,
    metadata: {
      ...options?.metadata,
      templateCode
    }
  });
}

/**
 * Send bulk SMS
 */
export async function sendBulkSMS(
  recipients: Array<{ phone: string; message: string }>,
  category: SMSCategory,
  options?: {
    userId?: string;
    batchId?: string;
  }
): Promise<{
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  results: SMSResponse[];
}> {
  const results: SMSResponse[] = [];
  let sent = 0;
  let failed = 0;
  
  for (const recipient of recipients) {
    const result = await sendSMS({
      to: recipient.phone,
      message: recipient.message,
      category,
      userId: options?.userId,
      metadata: { batchId: options?.batchId }
    });
    
    results.push(result);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }
  
  return {
    success: failed === 0,
    total: recipients.length,
    sent,
    failed,
    results
  };
}

/**
 * Generate OTP and send via SMS
 */
export async function sendOTP(
  phone: string,
  userId?: string
): Promise<{ success: boolean; otp?: string; message: string }> {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  const result = await sendTemplateSMS('OTP_VERIFICATION', phone, { otp }, { userId });
  
  if (result.success) {
    // In production, store OTP hash in database with expiry
    return {
      success: true,
      otp, // In production, don't return this - just for development
      message: 'OTP sent successfully'
    };
  }
  
  return {
    success: false,
    message: result.message
  };
}

/**
 * Get SMS delivery status
 */
export async function getSMSStatus(messageId: string): Promise<{
  status: SMSStatus;
  deliveredAt?: string;
}> {
  // In production, query Africa's Talking API for delivery status
  return {
    status: 'delivered'
  };
}

/**
 * Get available templates
 */
export function getTemplates(): SMSTemplate[] {
  return Object.values(SMS_TEMPLATES);
}

/**
 * Get template by code
 */
export function getTemplate(code: string): SMSTemplate | undefined {
  return SMS_TEMPLATES[code];
}

export default {
  sendSMS,
  sendTemplateSMS,
  sendBulkSMS,
  sendOTP,
  getSMSStatus,
  getTemplates,
  getTemplate,
  formatPhoneNumber,
  isValidPhoneNumber
};
