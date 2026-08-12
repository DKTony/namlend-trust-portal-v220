import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';
import { cn } from '@/lib/utils';
import { useMutation, useQuery as useConvexQuery } from 'convex/react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ApprovalNotification {
  id: string;
  type: string;
  request_type?: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  request_id?: string;
  priority?: string;
  metadata?: {
    priority?: string;
    request_type?: string;
  };
}

interface ApprovalNotificationsProps {
  showUnreadOnly?: boolean;
  maxHeight?: string;
  onMarkedRead?: () => void;
  embedded?: boolean;
}

export default function ApprovalNotifications({
  showUnreadOnly = false,
  maxHeight = '400px',
  onMarkedRead,
  embedded = false,
}: ApprovalNotificationsProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const markNotificationRead = useMutation(api.notifications.markNotificationRead);

  // Convex reactive query for notifications (no polling needed)
  const rawNotifications = useConvexQuery(api.notifications.getMyNotifications, {});

  useEffect(() => {
    if (rawNotifications !== undefined) {
      const mapped: ApprovalNotification[] = rawNotifications.map((n: any) => ({
        id: String(n._id),
        type: n.type ?? 'info',
        request_type: n.requestType,
        title: n.title ?? '',
        message: n.message ?? n.body ?? '',
        is_read: n.isRead ?? n.read ?? false,
        read_at: n.readAt ? new Date(n.readAt).toISOString() : undefined,
        created_at: n._creationTime
          ? new Date(n._creationTime).toISOString()
          : new Date().toISOString(),
        request_id: n.requestId ? String(n.requestId) : undefined,
        priority: n.priority,
        metadata: {
          priority: n.priority,
          request_type: n.requestType,
        },
      }));
      const filtered = showUnreadOnly ? mapped.filter((n) => !n.is_read) : mapped;
      setNotifications(filtered);
      setUnreadCount(mapped.filter((n) => !n.is_read).length);
      setLoading(false);
    }
  }, [rawNotifications, showUnreadOnly]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationRead({ notificationId: notificationId as Id<'notifications'> });
      if (onMarkedRead) onMarkedRead();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const getNotificationIcon = (type: string, requestType?: string) => {
    switch (type) {
      case 'new_request':
        if (requestType === 'loan_application') return DollarSign;
        if (requestType === 'kyc_document') return FileText;
        if (requestType === 'profile_update') return User;
        return Bell;
      case 'status_update':
        return CheckCircle;
      case 'assignment':
        return User;
      case 'reminder':
        return Clock;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return 'text-muted-foreground/50';

    switch (type) {
      case 'new_request':
        return 'text-blue-600';
      case 'status_update':
        return 'text-emerald-600';
      case 'assignment':
        return 'text-blue-700';
      case 'reminder':
        return 'text-amber-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 gap-3',
          embedded ? '' : 'bg-background border rounded-xl'
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        <p className="text-xs text-muted-foreground font-medium">Checking updates...</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden',
        !embedded && 'bg-background border border-border rounded-xl shadow-2xl'
      )}
    >
      {!embedded && (
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellRing className="h-4 w-4 text-primary" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold text-foreground">Approvals</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-[10px] rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {showUnreadOnly ? 'Unread Only' : 'All Updates'}
          </span>
        </div>
      )}

      <ScrollArea
        style={{ height: maxHeight }}
        className={cn('bg-background/50', embedded && 'scrollbar-none')}
      >
        <div className="divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">No updates found</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up on approvals.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getNotificationIcon(
                notification.type,
                notification.metadata?.request_type as string | undefined
              );
              const iconColor = getNotificationColor(notification.type, notification.is_read);

              return (
                <div
                  key={notification.id}
                  data-testid={`notification-${notification.id}`}
                  className={cn(
                    'p-4 transition-all duration-200 hover:bg-muted/40 group relative',
                    !notification.is_read && 'bg-primary/5 hover:bg-primary/10'
                  )}
                >
                  {/* Unread indicator strip */}
                  {!notification.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                  )}

                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105',
                        notification.is_read
                          ? 'bg-muted/50 border-border/50'
                          : 'border-[#DCE8D8] bg-white'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', iconColor)} />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p
                            className={cn(
                              'text-sm leading-tight mb-1 pr-2',
                              notification.is_read
                                ? 'text-muted-foreground font-medium'
                                : 'text-foreground font-semibold'
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>

                        {!notification.is_read && (
                          <ThemedButton
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full shrink-0 -mt-1 -mr-1 transition-colors"
                            title="Mark as read"
                            data-testid={`notification-mark-read-${notification.id}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </ThemedButton>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>

                        {notification.metadata?.request_type && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 h-5 bg-background border-border text-muted-foreground capitalize font-normal"
                            >
                              {(notification.metadata.request_type as string)?.replace('_', ' ')}
                            </Badge>
                            {notification.metadata.priority &&
                              notification.metadata.priority !== 'normal' && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] px-1.5 h-5 border-0 font-medium capitalize',
                                    notification.metadata.priority === 'urgent'
                                      ? 'bg-red-500/10 text-red-600'
                                      : notification.metadata.priority === 'high'
                                        ? 'bg-amber-500/10 text-amber-700'
                                        : 'bg-muted text-muted-foreground'
                                  )}
                                >
                                  {notification.metadata.priority as string}
                                </Badge>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Notification Bell Component for Header
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Convex reactive query — auto-refreshes, no polling needed
  const rawNotifications = useConvexQuery(api.notifications.getMyNotifications, {});
  const unreadCount = (rawNotifications ?? []).filter(
    (n: { isRead?: boolean; read?: boolean }) => !(n.isRead ?? n.read ?? false)
  ).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ThemedButton
          data-testid="notification-bell"
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-10 w-10 rounded-full transition-all duration-300',
            'hover:bg-accent/50 hover:scale-105 active:scale-95',
            open && 'bg-accent/50'
          )}
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
          'w-[calc(100vw-2rem)] max-w-[400px] overflow-hidden border border-[#DCE8D8] bg-white p-0 shadow-2xl',
          'rounded-3xl'
        )}
        align="end"
        sideOffset={8}
      >
        <div className="p-5 pb-4 flex items-center justify-between">
          <h3 className="font-bold text-lg tracking-tight">Admin Approvals</h3>
          {unreadCount > 0 && (
            <Badge
              variant="default"
              className="rounded-full px-2 h-5 bg-primary/90 text-[10px] font-bold"
            >
              {unreadCount} NEW
            </Badge>
          )}
        </div>

        <ApprovalNotifications showUnreadOnly={false} maxHeight="400px" embedded={true} />

        <div className="p-3 border-t border-border/40 bg-muted/30 backdrop-blur-sm">
          <ThemedButton
            variant="ghost"
            size="sm"
            className="w-full text-xs font-medium h-9 rounded-xl hover:bg-primary/5 hover:text-primary"
            onClick={() => {
              setOpen(false);
              navigate('/admin/approvals');
            }}
          >
            View All Approvals
            <ExternalLink className="h-3 w-3 ml-2 opacity-50" />
          </ThemedButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
