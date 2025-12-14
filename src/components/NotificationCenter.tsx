/**
 * Notification Center Component
 * Displays in-app notifications with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
  formatNotificationTime,
  type Notification
} from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';

interface NotificationCenterProps {
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  loan: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  payment: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  kyc: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  account: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  general: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
  marketing: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
};

const PRIORITY_STYLES: Record<string, string> = {
  low: '',
  normal: '',
  high: 'border-l-4 border-l-orange-500 dark:border-l-orange-400',
  urgent: 'border-l-4 border-l-red-500 dark:border-l-red-400 bg-red-50 dark:bg-red-900/10'
};

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await getNotifications({
        limit: 50,
        isRead: activeTab === 'unread' ? false : undefined
      });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
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
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return unsubscribe;
  }, [user?.id]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (notification.action_url) {
      setOpen(false);
      navigate(notification.action_url);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const count = await markAllAsRead();
    if (count > 0) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  // Filter notifications by tab
  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[380px] p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {activeTab === 'unread' 
                      ? "You're all caught up!" 
                      : "No notifications yet"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="p-2 border-t bg-muted/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Individual notification item
interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <button
      className={cn(
        "w-full text-left p-4 hover:bg-muted/50 transition-colors",
        !notification.is_read && "bg-blue-50/50",
        PRIORITY_STYLES[notification.priority]
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="pt-1">
          {!notification.is_read ? (
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          ) : (
            <div className="w-2 h-2" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge 
              variant="secondary" 
              className={cn("text-xs font-normal", CATEGORY_COLORS[notification.category])}
            >
              {notification.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatNotificationTime(notification.created_at)}
            </span>
          </div>
          
          <p className={cn(
            "text-sm font-medium line-clamp-1",
            !notification.is_read && "text-foreground",
            notification.is_read && "text-muted-foreground"
          )}>
            {notification.title}
          </p>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>

          {notification.action_url && notification.action_label && (
            <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
              <span>{notification.action_label}</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default NotificationCenter;
