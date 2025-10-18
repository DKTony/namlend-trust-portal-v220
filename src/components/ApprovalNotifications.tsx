import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
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
  User
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
        return 'text-blue-600';
      case 'status_update':
        return 'text-green-600';
      case 'assignment':
        return 'text-purple-600';
      case 'reminder':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5 text-blue-600" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            Notifications
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          {showUnreadOnly ? 'Unread notifications' : 'All notifications'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2" />
                <p>No notifications found</p>
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
                    className={`p-3 border rounded-lg transition-colors ${
                      notification.is_read 
                        ? 'bg-background' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${iconColor}`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${
                              notification.is_read ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {notification.title}
                            </p>
                            <p className={`text-xs mt-1 ${
                              notification.is_read ? 'text-muted-foreground' : 'text-muted-foreground'
                            }`}>
                              {notification.message}
                            </p>
                          </div>
                          
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="ml-2 h-6 w-6 p-0"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.sent_at), { 
                              addSuffix: true 
                            })}
                          </span>
                          
                          {notification.metadata?.request_type && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {notification.metadata.request_type?.replace('_', ' ')}
                              </Badge>
                              <Badge 
                                variant={
                                  notification.metadata.priority === 'urgent' ? 'destructive' :
                                  notification.metadata.priority === 'high' ? 'default' :
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {notification.metadata.priority || 'normal'}
                              </Badge>
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
      </CardContent>
    </Card>
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
        className="relative"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50">
          <ApprovalNotifications 
            showUnreadOnly={true} 
            maxHeight="300px" 
            onMarkedRead={() => setUnreadCount((c) => Math.max(0, c - 1))}
          />
        </div>
      )}
    </div>
  );
}
