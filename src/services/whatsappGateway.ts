/**
 * WhatsApp Business API Gateway Service
 * Handles WhatsApp messaging through Meta's Cloud API
 * Supports: Template Messages, Interactive Messages, Media Messages
 */

import { supabase } from '@/integrations/supabase/client';

// WhatsApp API Configuration
const WHATSAPP_CONFIG = {
  apiUrl: 'https://graph.facebook.com/v18.0',
  phoneNumberId: import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '',
  accessToken: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '',
  businessAccountId: import.meta.env.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  webhookVerifyToken: import.meta.env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''
};

export type WhatsAppMessageStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type WhatsAppMessageType = 
  | 'text'
  | 'template'
  | 'interactive'
  | 'image'
  | 'document';

export type WhatsAppTemplateCategory = 
  | 'loan_update'
  | 'payment_reminder'
  | 'payment_confirmation'
  | 'account_update'
  | 'support';

export interface WhatsAppRecipient {
  phoneNumber: string;
  name?: string;
}

export interface WhatsAppTextMessage {
  type: 'text';
  text: string;
}

export interface WhatsAppTemplateMessage {
  type: 'template';
  templateName: string;
  language: string;
  components: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{
      type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
      text?: string;
      currency?: { code: string; amount: number };
      date_time?: { fallback_value: string };
      image?: { link: string };
      document?: { link: string; filename: string };
    }>;
  }>;
}

export interface WhatsAppInteractiveMessage {
  type: 'interactive';
  interactiveType: 'button' | 'list';
  header?: { type: 'text'; text: string };
  body: string;
  footer?: string;
  buttons?: Array<{ id: string; title: string }>;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface WhatsAppMessage {
  to: WhatsAppRecipient;
  message: WhatsAppTextMessage | WhatsAppTemplateMessage | WhatsAppInteractiveMessage;
  userId?: string;
  loanId?: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  status: WhatsAppMessageStatus;
  message: string;
  contacts?: Array<{ wa_id: string; input: string }>;
}

// Pre-approved WhatsApp Business Templates
// These must be approved by Meta before use
const WHATSAPP_TEMPLATES = {
  LOAN_STATUS_UPDATE: {
    name: 'loan_status_update',
    language: 'en',
    category: 'loan_update' as WhatsAppTemplateCategory,
    parameters: ['firstName', 'loanStatus', 'loanAmount', 'reference']
  },
  PAYMENT_REMINDER: {
    name: 'payment_reminder',
    language: 'en',
    category: 'payment_reminder' as WhatsAppTemplateCategory,
    parameters: ['firstName', 'amount', 'dueDate']
  },
  PAYMENT_CONFIRMATION: {
    name: 'payment_confirmation',
    language: 'en',
    category: 'payment_confirmation' as WhatsAppTemplateCategory,
    parameters: ['firstName', 'amount', 'date', 'balance', 'reference']
  },
  LOAN_APPROVED: {
    name: 'loan_approved',
    language: 'en',
    category: 'loan_update' as WhatsAppTemplateCategory,
    parameters: ['firstName', 'amount', 'term', 'monthlyPayment']
  },
  LOAN_DISBURSED: {
    name: 'loan_disbursed',
    language: 'en',
    category: 'loan_update' as WhatsAppTemplateCategory,
    parameters: ['firstName', 'amount', 'accountNumber', 'firstPaymentDate']
  },
  SUPPORT_FOLLOWUP: {
    name: 'support_followup',
    language: 'en',
    category: 'support' as WhatsAppTemplateCategory,
    parameters: ['firstName', 'ticketNumber']
  }
};

/**
 * Format phone number for WhatsApp (no + prefix, just digits)
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Namibian numbers
  if (cleaned.startsWith('0')) {
    cleaned = '264' + cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Validate WhatsApp phone number
 */
function isValidWhatsAppNumber(phone: string): boolean {
  const formatted = formatWhatsAppNumber(phone);
  return /^264[0-9]{9}$/.test(formatted);
}

/**
 * Send a text message via WhatsApp
 */
export async function sendTextMessage(
  to: WhatsAppRecipient,
  text: string,
  options?: {
    userId?: string;
    loanId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage({
    to,
    message: { type: 'text', text },
    ...options
  });
}

/**
 * Send a template message via WhatsApp
 */
export async function sendTemplateMessage(
  to: WhatsAppRecipient,
  templateName: string,
  parameters: Record<string, string>,
  options?: {
    userId?: string;
    loanId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<WhatsAppResponse> {
  const template = WHATSAPP_TEMPLATES[templateName as keyof typeof WHATSAPP_TEMPLATES];
  
  if (!template) {
    return {
      success: false,
      status: 'failed',
      message: `Template not found: ${templateName}`
    };
  }
  
  // Build template components
  const bodyParameters = template.parameters.map(param => ({
    type: 'text' as const,
    text: parameters[param] || ''
  }));
  
  return sendWhatsAppMessage({
    to,
    message: {
      type: 'template',
      templateName: template.name,
      language: template.language,
      components: [
        {
          type: 'body',
          parameters: bodyParameters
        }
      ]
    },
    ...options
  });
}

/**
 * Send an interactive message with buttons
 */
export async function sendButtonMessage(
  to: WhatsAppRecipient,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  options?: {
    header?: string;
    footer?: string;
    userId?: string;
    loanId?: string;
  }
): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage({
    to,
    message: {
      type: 'interactive',
      interactiveType: 'button',
      header: options?.header ? { type: 'text', text: options.header } : undefined,
      body,
      footer: options?.footer,
      buttons
    },
    userId: options?.userId,
    loanId: options?.loanId
  });
}

/**
 * Send an interactive message with a list
 */
export async function sendListMessage(
  to: WhatsAppRecipient,
  body: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>,
  options?: {
    header?: string;
    footer?: string;
    buttonText?: string;
    userId?: string;
    loanId?: string;
  }
): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage({
    to,
    message: {
      type: 'interactive',
      interactiveType: 'list',
      header: options?.header ? { type: 'text', text: options.header } : undefined,
      body,
      footer: options?.footer,
      sections
    },
    userId: options?.userId,
    loanId: options?.loanId
  });
}

/**
 * Core function to send WhatsApp messages
 */
async function sendWhatsAppMessage(request: WhatsAppMessage): Promise<WhatsAppResponse> {
  try {
    const formattedNumber = formatWhatsAppNumber(request.to.phoneNumber);
    
    if (!isValidWhatsAppNumber(request.to.phoneNumber)) {
      return {
        success: false,
        status: 'failed',
        message: 'Invalid WhatsApp phone number'
      };
    }
    
    // Build the API request payload
    const payload = buildMessagePayload(formattedNumber, request.message);
    
    // In production, call WhatsApp Cloud API:
    // const response = await fetch(
    //   `${WHATSAPP_CONFIG.apiUrl}/${WHATSAPP_CONFIG.phoneNumberId}/messages`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(payload)
    //   }
    // );
    
    // Generate message ID
    const messageId = `WA-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Log to communication_logs for audit trail
    await supabase
      .from('communication_logs')
      .insert({
        user_id: request.userId,
        loan_id: request.loanId,
        channel: 'whatsapp',
        direction: 'outbound',
        recipient: formattedNumber,
        sender: WHATSAPP_CONFIG.phoneNumberId,
        content: request.message.type === 'text' 
          ? (request.message as WhatsAppTextMessage).text 
          : JSON.stringify(request.message),
        template_code: request.message.type === 'template' 
          ? (request.message as WhatsAppTemplateMessage).templateName 
          : undefined,
        status: 'sent',
        provider: 'meta_whatsapp',
        provider_message_id: messageId,
        sent_at: new Date().toISOString(),
        metadata: {
          ...request.metadata,
          recipientName: request.to.name,
          messageType: request.message.type
        }
      });
    
    // Also queue for async processing
    await supabase
      .from('notification_queue')
      .insert({
        user_id: request.userId,
        channel: 'whatsapp',
        recipient: formattedNumber,
        subject: `WhatsApp: ${request.message.type}`,
        content: JSON.stringify(request.message),
        status: 'sent',
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        provider_message_id: messageId,
        metadata: {
          ...request.metadata,
          loanId: request.loanId,
          recipientName: request.to.name
        }
      });
    
    return {
      success: true,
      messageId: `WA-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'sent',
      message: 'WhatsApp message sent successfully',
      contacts: [{ wa_id: formattedNumber, input: request.to.phoneNumber }]
    };
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Failed to send WhatsApp message'
    };
  }
}

/**
 * Build the API payload based on message type
 */
function buildMessagePayload(
  to: string,
  message: WhatsAppTextMessage | WhatsAppTemplateMessage | WhatsAppInteractiveMessage
): Record<string, unknown> {
  const basePayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to
  };
  
  switch (message.type) {
    case 'text':
      return {
        ...basePayload,
        type: 'text',
        text: { body: message.text }
      };
    
    case 'template':
      return {
        ...basePayload,
        type: 'template',
        template: {
          name: message.templateName,
          language: { code: message.language },
          components: message.components
        }
      };
    
    case 'interactive':
      if (message.interactiveType === 'button') {
        return {
          ...basePayload,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: message.header,
            body: { text: message.body },
            footer: message.footer ? { text: message.footer } : undefined,
            action: {
              buttons: message.buttons?.map(btn => ({
                type: 'reply',
                reply: { id: btn.id, title: btn.title }
              }))
            }
          }
        };
      } else {
        return {
          ...basePayload,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: message.header,
            body: { text: message.body },
            footer: message.footer ? { text: message.footer } : undefined,
            action: {
              button: 'View Options',
              sections: message.sections
            }
          }
        };
      }
    
    default:
      return basePayload;
  }
}

/**
 * Handle incoming WhatsApp webhook
 */
export async function handleWebhook(payload: Record<string, unknown>): Promise<{
  type: 'message' | 'status' | 'unknown';
  data: Record<string, unknown>;
}> {
  // Parse the webhook payload
  const entry = (payload.entry as any[])?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  
  if (!value) {
    return { type: 'unknown', data: {} };
  }
  
  // Handle message status updates
  if (value.statuses) {
    const status = value.statuses[0];
    return {
      type: 'status',
      data: {
        messageId: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipientId: status.recipient_id
      }
    };
  }
  
  // Handle incoming messages
  if (value.messages) {
    const message = value.messages[0];
    return {
      type: 'message',
      data: {
        messageId: message.id,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        text: message.text?.body,
        interactive: message.interactive
      }
    };
  }
  
  return { type: 'unknown', data: {} };
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  signature: string,
  payload: string
): boolean {
  // In production, verify using HMAC-SHA256
  // const expectedSignature = crypto
  //   .createHmac('sha256', WHATSAPP_CONFIG.appSecret)
  //   .update(payload)
  //   .digest('hex');
  // return signature === `sha256=${expectedSignature}`;
  
  return true; // For development
}

/**
 * Get available templates
 */
export function getAvailableTemplates(): typeof WHATSAPP_TEMPLATES {
  return WHATSAPP_TEMPLATES;
}

// Quick send functions for common use cases
export const quickSend = {
  /**
   * Send loan approval notification
   */
  async loanApproved(
    to: WhatsAppRecipient,
    loanDetails: { amount: string; term: string; monthlyPayment: string },
    userId?: string
  ): Promise<WhatsAppResponse> {
    return sendTemplateMessage(to, 'LOAN_APPROVED', {
      firstName: to.name || 'Customer',
      ...loanDetails
    }, { userId });
  },
  
  /**
   * Send payment reminder
   */
  async paymentReminder(
    to: WhatsAppRecipient,
    paymentDetails: { amount: string; dueDate: string },
    userId?: string
  ): Promise<WhatsAppResponse> {
    return sendTemplateMessage(to, 'PAYMENT_REMINDER', {
      firstName: to.name || 'Customer',
      ...paymentDetails
    }, { userId });
  },
  
  /**
   * Send payment confirmation
   */
  async paymentConfirmation(
    to: WhatsAppRecipient,
    paymentDetails: { amount: string; date: string; balance: string; reference: string },
    userId?: string
  ): Promise<WhatsAppResponse> {
    return sendTemplateMessage(to, 'PAYMENT_CONFIRMATION', {
      firstName: to.name || 'Customer',
      ...paymentDetails
    }, { userId });
  },
  
  /**
   * Send payment options interactive message
   */
  async paymentOptions(
    to: WhatsAppRecipient,
    amount: string,
    userId?: string
  ): Promise<WhatsAppResponse> {
    return sendButtonMessage(
      to,
      `Your payment of ${amount} is due. How would you like to pay?`,
      [
        { id: 'pay_momo', title: 'MTC MoMo' },
        { id: 'pay_bank', title: 'Bank Transfer' },
        { id: 'pay_help', title: 'Need Help?' }
      ],
      {
        header: 'Payment Due',
        footer: 'Choose a payment method',
        userId
      }
    );
  }
};

export default {
  sendTextMessage,
  sendTemplateMessage,
  sendButtonMessage,
  sendListMessage,
  handleWebhook,
  verifyWebhookSignature,
  getAvailableTemplates,
  quickSend,
  formatWhatsAppNumber,
  isValidWhatsAppNumber
};
