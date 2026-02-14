/**
 * API Notifications - Orchestration Layer
 * Centralized API for notification operations
 *
 * Endpoints:
 * - GET    /list              - List notifications for current user
 * - GET    /:id               - Get notification details
 * - POST   /mark-read         - Mark notification as read
 * - POST   /mark-all-read     - Mark all notifications as read
 * - DELETE /:id               - Delete notification
 * - GET    /preferences       - Get notification preferences
 * - PUT    /preferences       - Update notification preferences
 * - POST   /send              - Send notification (admin only)
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuth, verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateBody, validateQuery, paginationSchema } from '../_shared/validation.ts';
import { createAuditLog } from '../_shared/audit.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-notifications');

// Schemas
const notificationFilterSchema = paginationSchema.extend({
  type: z.enum([
    'loan_approved',
    'loan_rejected',
    'payment_due',
    'payment_received',
    'disbursement_complete',
    'document_required',
    'system'
  ]).optional(),
  read: z.boolean().optional(),
});

const markReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100),
});

const preferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  whatsapp_enabled: z.boolean().optional(),
  loan_updates: z.boolean().optional(),
  payment_reminders: z.boolean().optional(),
  marketing: z.boolean().optional(),
  quiet_hours_start: z.string().optional(),
  quiet_hours_end: z.string().optional(),
});

const sendNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum([
    'loan_approved',
    'loan_rejected',
    'payment_due',
    'payment_received',
    'disbursement_complete',
    'document_required',
    'system'
  ]),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  channels: z.array(z.enum(['app', 'email', 'sms', 'whatsapp'])).optional(),
  data: z.record(z.unknown()).optional(),
});

// GET /list - List notifications for current user
router.get('/list', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, notificationFilterSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as {
    page: number;
    limit: number;
    type?: string;
    read?: boolean;
  };
  const { page, limit, type, read } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.user.id);

  if (type) query = query.eq('type', type);
  if (read !== undefined) query = query.eq('read', read);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return response.serverError(error.message);
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact' })
    .eq('user_id', auth.user.id)
    .eq('read', false);

  return response.success(data, {
    page,
    limit,
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
    unread_count: unreadCount || 0
  });
});

// GET /:id - Get notification details
router.get('/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();

  const { data: notification, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !notification) {
    return response.notFound('Notification not found');
  }

  // Check ownership
  if (notification.user_id !== auth.user.id && auth.user.role !== 'admin') {
    return response.forbidden('Access denied');
  }

  return response.success(notification);
});

// POST /mark-read - Mark notifications as read
router.post('/mark-read', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const validation = await validateBody(req, markReadSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as { notification_ids: string[] };
  const supabase = getServiceClient();

  // Update only user's own notifications
  const { error, count } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .in('id', data.notification_ids);

  if (error) {
    return response.serverError(error.message);
  }

  return response.success({
    message: 'Notifications marked as read',
    updated_count: count || 0
  });
});

// POST /mark-all-read - Mark all notifications as read
router.post('/mark-all-read', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();

  const { error, count } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .eq('read', false);

  if (error) {
    return response.serverError(error.message);
  }

  return response.success({
    message: 'All notifications marked as read',
    updated_count: count || 0
  });
});

// DELETE /:id - Delete notification
router.delete('/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();

  // Verify ownership
  const { data: notification, error: checkError } = await supabase
    .from('notifications')
    .select('id, user_id')
    .eq('id', params.id)
    .single();

  if (checkError || !notification) {
    return response.notFound('Notification not found');
  }

  if (notification.user_id !== auth.user.id && auth.user.role !== 'admin') {
    return response.forbidden('Access denied');
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', params.id);

  if (error) {
    return response.serverError(error.message);
  }

  return response.success({ message: 'Notification deleted' });
});

// GET /preferences - Get notification preferences
router.get('/preferences', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();

  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', auth.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return response.serverError(error.message);
  }

  // Return defaults if no preferences exist
  const defaultPreferences = {
    user_id: auth.user.id,
    email_enabled: true,
    sms_enabled: true,
    push_enabled: true,
    whatsapp_enabled: false,
    loan_updates: true,
    payment_reminders: true,
    marketing: false,
    quiet_hours_start: null,
    quiet_hours_end: null
  };

  return response.success(preferences || defaultPreferences);
});

// PUT /preferences - Update notification preferences
router.put('/preferences', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const validation = await validateBody(req, preferencesSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as Record<string, unknown>;
  const supabase = getServiceClient();

  // Upsert preferences
  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: auth.user.id,
      ...data,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'NOTIFICATION_PREFERENCES_UPDATED',
    table_name: 'notification_preferences',
    record_id: auth.user.id,
    new_data: data,
  });

  return response.success(preferences);
});

// POST /send - Send notification (admin only)
router.post('/send', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const validation = await validateBody(req, sendNotificationSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    user_id: string;
    type: string;
    title: string;
    message: string;
    channels?: string[];
    data?: Record<string, unknown>;
  };
  const supabase = getServiceClient();

  // Create in-app notification
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      read: false,
      created_by: auth.user.id
    })
    .select()
    .single();

  if (error) {
    return response.serverError(error.message);
  }

  // Send via other channels if specified
  const channels = data.channels || ['app'];
  const results: Record<string, boolean> = { app: true };

  // Get user profile for contact info
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone_number, email')
    .eq('user_id', data.user_id)
    .single();

  // Queue SMS if requested
  if (channels.includes('sms') && profile?.phone_number) {
    await supabase.from('sms_queue').insert({
      phone_number: profile.phone_number,
      message: `${data.title}: ${data.message}`,
      status: 'pending',
      notification_id: notification.id
    });
    results.sms = true;
  }

  // Queue email if requested
  if (channels.includes('email') && profile?.email) {
    await supabase.from('email_queue').insert({
      email: profile.email,
      subject: data.title,
      body: data.message,
      status: 'pending',
      notification_id: notification.id
    });
    results.email = true;
  }

  // Queue WhatsApp if requested
  if (channels.includes('whatsapp') && profile?.phone_number) {
    await supabase.from('whatsapp_queue').insert({
      phone_number: profile.phone_number,
      message: data.message,
      status: 'pending',
      notification_id: notification.id
    });
    results.whatsapp = true;
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'NOTIFICATION_SENT',
    table_name: 'notifications',
    record_id: notification.id,
    new_data: { ...data, channels_sent: results } as Record<string, unknown>,
  });

  return response.created({
    notification,
    channels_sent: results
  });
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
