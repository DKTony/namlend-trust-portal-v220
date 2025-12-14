import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  getApprovalNotifications, 
  markNotificationAsRead,
  type ApprovalNotification 
} from '@/services/approvalWorkflow';
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  DollarSign,
  User,
  Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ApprovalNotificationsProps {
  showUnreadOnly?: boolean;
  maxHeight?: string;
  onMarkedRead?: () => void;
}

export default function ApprovalNotifications({ 
  showUnreadOnly = false, 
  maxHeight = "400px",
  onMarkedRead,
}: ApprovalNotificationsProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    // Set up polling for new notifications
    const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [showUnreadOnly]);

  const loadNotifications = async () => {
    try {
      const result = await getApprovalNotifications(showUnreadOnly);
      
      if (result.success && result.notifications) {
        setNotifications(result.notifications);
        setUnreadCount(result.notifications.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const result = await markNotificationAsRead(notificationId);
      
      if (result.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        // notify parent (e.g., NotificationBell) so it can update badge immediately
        if (onMarkedRead) onMarkedRead();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
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
    if (isRead) return 'text-muted-foreground';
    
    switch (type) {
      case 'new_request':
        return 'text-blue-500 dark:text-blue-400';
      case 'status_update':
        return 'text-green-500 dark:text-green-400';
      case 'assignment':
        return 'text-purple-500 dark:text-purple-400';
      case 'reminder':
        return 'text-orange-500 dark:text-orange-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Notifications</span>
        </div>
        <div className="flex items-center justify-center py-12">
          <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4 text-blue-500" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-1 bg-blue-600 hover:bg-blue-700 text-white border-0 h-5 px-1.5 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          {showUnreadOnly ? 'Unread Only' : 'All'}
        </span>
      </div>
      
      <ScrollArea style={{ height: maxHeight }} className="bg-background">
        <div className="divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-3">
                 <Bell className="h-5 w-5 opacity-50" />
              </div>
              <p className="text-sm">No notifications found</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getNotificationIcon(
                notification.notification_type,
                notification.metadata?.request_type
              );
              const iconColor = getNotificationColor(
                notification.notification_type,
                notification.is_read
              );

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 transition-all duration-200 hover:bg-muted/50 group relative",
                    !notification.is_read && "bg-blue-500/5 dark:bg-blue-500/10"
                  )}
                >
                  {/* Unread indicator dot */}
                  {!notification.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center border shrink-0 mt-0.5",
                      notification.is_read 
                        ? "bg-muted border-border" 
                        : "bg-background border-border shadow-sm"
                    )}>
                       <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm leading-tight mb-1",
                            notification.is_read ? "text-muted-foreground font-medium" : "text-foreground font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                        
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 rounded-full shrink-0 -mt-1 -mr-1"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          {formatDistanceToNow(new Date(notification.sent_at), { 
                            addSuffix: true 
                          })}
                        </span>
                        
                        {notification.metadata?.request_type && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-muted border-border text-muted-foreground capitalize font-normal">
                              {notification.metadata.request_type?.replace('_', ' ')}
                            </Badge>
                            {notification.metadata.priority && notification.metadata.priority !== 'normal' && (
                              <Badge 
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 h-5 border-0 font-medium capitalize",
                                  notification.metadata.priority === 'urgent' ? "bg-red-500/10 text-red-500 dark:text-red-400" :
                                  notification.metadata.priority === 'high' ? "bg-orange-500/10 text-orange-500 dark:text-orange-400" :
                                  "bg-muted text-muted-foreground"
                                )}
                              >
                                {notification.metadata.priority}
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const result = await getApprovalNotifications(true);
        if (result.success && result.notifications) {
          setUnreadCount(result.notifications.length);
        }
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setShowDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "relative h-9 w-9 rounded-full transition-colors",
          showDropdown ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background" />
        )}
      </Button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-[380px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <ApprovalNotifications 
            showUnreadOnly={false} 
            maxHeight="400px" 
            onMarkedRead={() => setUnreadCount((c) => Math.max(0, c - 1))}
          />
        </div>
      )}
    </div>
  );
}
