/**
 * Backend Notification Service
 * Version: v3.0.0
 * 
 * Integrates with the main platform's notification system
 * Fetches notifications from Supabase and provides real-time updates
 */

import { supabase } from './supabaseClient';
import { BackendNotification, NotificationCategory, NotificationPreference } from '../types';

export interface NotificationFilters {
  category?: NotificationCategory;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationsResult {
  notifications: BackendNotification[];
  total: number;
  unreadCount: number;
}

export class BackendNotificationService {
  /**
   * Get notifications for current user
   */
  static async getNotifications(
    filters?: NotificationFilters
  ): Promise<NotificationsResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { notifications: [], total: 0, unreadCount: 0 };
      }

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return { notifications: [], total: 0, unreadCount: 0 };
      }

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      return {
        notifications: (data || []) as BackendNotification[],
        total: count || 0,
        unreadCount: unreadCount || 0
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  }

  /**
   * Get unread notification count using RPC
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_unread_notification_count');

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('mark_all_notifications_read');

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(): Promise<NotificationPreference[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return [];
      }

      return (data || []) as NotificationPreference[];
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return [];
    }
  }

  /**
   * Update notification preference
   */
  static async updatePreference(
    channel: string,
    category: string,
    enabled: boolean
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

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
        console.error('Error updating notification preference:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preference:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  static subscribeToNotifications(
    userId: string,
    onNotification: (notification: BackendNotification) => void
  ): () => void {
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
        (payload: { new: Record<string, unknown> }) => {
          onNotification(payload.new as unknown as BackendNotification);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Queue a notification (for admin/system use)
   */
  static async queueNotification(
    userId: string,
    templateCode: string,
    data: Record<string, unknown>,
    scheduledAt?: string
  ): Promise<{ success: boolean; notificationIds?: string[]; error?: string }> {
    try {
      const { data: result, error } = await supabase.rpc('queue_notification', {
        p_user_id: userId,
        p_template_code: templateCode,
        p_data: data,
        p_scheduled_at: scheduledAt || null
      });

      if (error) {
        console.error('Error queuing notification:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        notificationIds: result?.notification_ids || []
      };
    } catch (error) {
      console.error('Error queuing notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
