/**
 * Notification Service
 * Handles in-app notifications and notification preferences
 */

import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: 'loan' | 'payment' | 'kyc' | 'account' | 'general' | 'marketing';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  channel: 'in_app' | 'sms' | 'email' | 'whatsapp' | 'push';
  category: string;
  enabled: boolean;
}

export interface NotificationFilters {
  category?: string;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

// Fetch user's notifications
export async function getNotifications(filters: NotificationFilters = {}): Promise<{
  notifications: Notification[];
  total: number;
  unreadCount: number;
}> {
  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      // Silently handle missing table - notifications feature not yet deployed
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { notifications: [], total: 0, unreadCount: 0 };
      }
      console.error('Error fetching notifications:', error);
      return { notifications: [], total: 0, unreadCount: 0 };
    }

    // Get unread count - wrapped in try-catch for missing function
    let unreadCount = 0;
    try {
      const { data: unreadData, error: rpcError } = await supabase.rpc('get_unread_notification_count');
      if (!rpcError) {
        unreadCount = unreadData || 0;
      }
    } catch {
      // RPC function may not exist yet
    }

    return {
      notifications: data as Notification[],
      total: count || 0,
      unreadCount
    };
  } catch (error) {
    // Silently fail - notifications feature may not be deployed yet
    return { notifications: [], total: 0, unreadCount: 0 };
  }
}

// Get unread notification count
export async function getUnreadCount(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_unread_notification_count');
    
    if (error) {
      // Silently fail - function may not exist yet
      return 0;
    }

    return data || 0;
  } catch {
    // Silently fail - notifications feature may not be deployed yet
    return 0;
  }
}

// Mark a notification as read
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId
    });

    if (error) {
      return false;
    }

    return data;
  } catch {
    return false;
  }
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      return 0;
    }

    return data || 0;
  } catch {
    return 0;
  }
}

// Get user's notification preferences
export async function getPreferences(): Promise<NotificationPreference[]> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*');

    if (error) {
      // Silently fail - table may not exist yet
      return [];
    }

    return data as NotificationPreference[];
  } catch {
    return [];
  }
}

// Update a notification preference
export async function updatePreference(
  channel: string,
  category: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        channel,
        category,
        enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,channel,category'
      });

    if (error) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Queue a notification (for admin/system use)
export async function queueNotification(
  userId: string,
  templateCode: string,
  data: Record<string, unknown> = {},
  scheduledAt?: Date
): Promise<string[]> {
  try {
    const { data: queueIds, error } = await supabase.rpc('queue_notification', {
      p_user_id: userId,
      p_template_code: templateCode,
      p_data: data,
      p_scheduled_at: scheduledAt?.toISOString() || new Date().toISOString()
    });

    if (error) {
      return [];
    }

    return queueIds || [];
  } catch {
    return [];
  }
}

// Subscribe to real-time notification updates
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Helper to format notification time
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short'
  });
}

// Notification template codes for easy reference
export const NotificationTemplates = {
  LOAN_SUBMITTED: 'LOAN_SUBMITTED',
  LOAN_UNDER_REVIEW: 'LOAN_UNDER_REVIEW',
  LOAN_APPROVED: 'LOAN_APPROVED',
  LOAN_REJECTED: 'LOAN_REJECTED',
  LOAN_DISBURSED: 'LOAN_DISBURSED',
  PAYMENT_DUE_7_DAYS: 'PAYMENT_DUE_7_DAYS',
  PAYMENT_DUE_3_DAYS: 'PAYMENT_DUE_3_DAYS',
  PAYMENT_DUE_1_DAY: 'PAYMENT_DUE_1_DAY',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  LOAN_COMPLETED: 'LOAN_COMPLETED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED'
} as const;

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreference,
  queueNotification,
  subscribeToNotifications,
  formatNotificationTime,
  NotificationTemplates
};
