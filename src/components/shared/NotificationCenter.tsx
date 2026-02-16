/**
 * Notification Center Component
 * NamLend Premium Design System (NPDS) - NextGen
 * Displays in-app notifications with real-time updates and glassmorphism UI
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, Loader2, BellRing, Inbox } from 'lucide-react';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import {
  subscribeToNotifications,
  formatNotificationTime,
  type Notification,
} from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '@/services/api-client';

interface NotificationCenterProps {
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  loan: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  payment:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  kyc: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  account:
    'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  general: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
  marketing: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
};

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { user } = useAuth();
  const { styles, isDark } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch notifications via API Orchestration Layer
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await notificationsAPI.list({
        limit: 50,
        is_read: activeTab === 'unread' ? false : undefined,
      });

      if (result.success && result.data) {
        const data = result.data as { notifications: Notification[]; unreadCount: number };
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);

  // Initial fetch and tab change
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return unsubscribe;
  }, [user?.id]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      const result = await notificationsAPI.markRead({ notification_id: notification.id });
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }

    if (notification.action_url) {
      setOpen(false);
      navigate(notification.action_url);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const result = await notificationsAPI.markAllRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  // Filter notifications by tab
  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ThemedButton
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-10 w-10 rounded-full transition-all duration-300',
            'hover:bg-accent/50 hover:scale-105 active:scale-95',
            open && 'bg-accent/50',
            className
          )}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-primary animate-pulse" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}

          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-background"></span>
            </span>
          )}
        </ThemedButton>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          'w-[calc(100vw-2rem)] max-w-[400px] p-0 overflow-hidden border shadow-2xl backdrop-blur-xl',
          isDark ? 'bg-zinc-950/80 border-white/10' : 'bg-white/80 border-black/5',
          'rounded-3xl'
        )}
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg tracking-tight">Notifications</h3>
            {unreadCount > 0 && (
              <Badge
                variant="default"
                className="rounded-full px-2 h-5 bg-primary/90 text-[10px] font-bold"
              >
                {unreadCount} NEW
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <ThemedButton
              variant="ghost"
              size="sm"
              className="text-xs h-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </ThemedButton>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-5 pb-2">
            <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger
                value="all"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Unread
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="m-0 focus-visible:outline-none">
            <ScrollArea className="h-[420px] scrollbar-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-[300px] gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                  <p className="text-xs text-muted-foreground font-medium">Loading updates...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center px-8">
                  <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <Inbox className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {activeTab === 'unread' ? 'All caught up!' : 'No notifications'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'unread'
                      ? 'You have no unread notifications at the moment.'
                      : "We'll notify you when something important happens."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="p-3 border-t border-border/40 bg-muted/30 backdrop-blur-sm">
          <ThemedButton
            variant="ghost"
            size="sm"
            className="w-full text-xs font-medium h-9 rounded-xl hover:bg-primary/5 hover:text-primary"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            View Full History
            <ExternalLink className="h-3 w-3 ml-2 opacity-50" />
          </ThemedButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Individual notification item
interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  isDark: boolean;
}

function NotificationItem({ notification, onClick, isDark }: NotificationItemProps) {
  const isUrgent = notification.priority === 'urgent' || notification.priority === 'high';

  return (
    <button
      className={cn(
        'w-full text-left p-5 transition-all duration-200 group relative',
        'hover:bg-muted/40',
        !notification.is_read && 'bg-primary/5 hover:bg-primary/10'
      )}
      onClick={onClick}
    >
      {/* Active Indicator Strip */}
      {!notification.is_read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
      )}

      <div className="flex items-start gap-4">
        {/* Status/Category Icon */}
        <div
          className={cn(
            'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105',
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'
          )}
        >
          {notification.priority === 'urgent' ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          ) : (
            <div
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                !notification.is_read ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-2 py-0 h-5 border font-medium uppercase tracking-wider',
                CATEGORY_COLORS[notification.category] || CATEGORY_COLORS.general
              )}
            >
              {notification.category}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              {formatNotificationTime(notification.created_at)}
            </span>
          </div>

          <h5
            className={cn(
              'text-sm font-semibold leading-tight mb-1 pr-4',
              !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {notification.title}
          </h5>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {notification.message}
          </p>

          {notification.action_url && notification.action_label && (
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-xs font-semibold text-primary group-hover:underline decoration-primary/30 underline-offset-4">
                {notification.action_label}
              </span>
              <ExternalLink className="h-3 w-3 text-primary opacity-50 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default NotificationCenter;
