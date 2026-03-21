/**
 * Notification Center Component
 * NamLend Premium Design System (NPDS) - NextGen
 * Displays in-app notifications with real-time updates and glassmorphism UI
 */

import { useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, Loader2, BellRing, Inbox } from 'lucide-react';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { type Id } from '@/integrations/convex/api';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: string;
  priority?: string;
  action_url?: string | null;
  action_label?: string;
  is_read: boolean;
  created_at: string;
}

function formatNotificationTime(dateString: string): string {
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

  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

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
  const [activeTab, setActiveTab] = useState('all');

  // Convex reactive queries — always subscribed, auto-update on changes
  const rawNotifications = useConvexQuery(
    api.notifications.getMyNotifications,
    user ? { isRead: activeTab === 'unread' ? false : undefined } : 'skip'
  );

  const rawUnreadCount = useConvexQuery(api.notifications.getUnreadCount, user ? {} : 'skip');

  const markReadMutation = useConvexMutation(api.notifications.markNotificationRead);
  const markAllReadMutation = useConvexMutation(api.notifications.markAllNotificationsRead);

  const loading = open && rawNotifications === undefined;
  const unreadCount = rawUnreadCount ?? 0;

  const notifications: Notification[] = useMemo(() => {
    if (!rawNotifications) return [];
    return (rawNotifications as Array<Record<string, unknown>>).map((n) => ({
      id: String(n._id),
      user_id: String(n.userId ?? ''),
      title: n.title ?? '',
      message: n.message ?? n.body ?? '',
      category: n.category ?? 'general',
      is_read: n.isRead ?? false,
      action_url: n.actionUrl ?? null,
      action_label: String(n.actionLabel ?? ''),
      created_at: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
    }));
  }, [rawNotifications]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markReadMutation({ notificationId: notification.id as Id<'notifications'> });
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }

    if (notification.action_url) {
      setOpen(false);
      navigate(notification.action_url);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
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
              // Navigate to dashboard notifications tab for clients, admin for staff
              navigate('/dashboard');
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
