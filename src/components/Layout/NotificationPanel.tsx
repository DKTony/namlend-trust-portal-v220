/**
 * @deprecated functionality has been superceded by NotificationCenter.tsx
 * Notification Panel Component
 * NamLend Premium Design System (NPDS) - NextGen
 * Slide-out notification panel with theme-aware styling and smooth animations
 */

import { ThemedButton } from '@/components/ui/ThemedButton';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Bell, DollarSign, FileText, ShieldAlert, X } from 'lucide-react';
import React from 'react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: number;
  type: 'payment' | 'security' | 'doc' | 'loan';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { styles } = useTheme();

  const notifications: NotificationItem[] = [
    {
      id: 1,
      type: 'payment',
      title: 'Payment Received',
      message: 'Your payment of N$ 1,200 has been processed via IPS.',
      time: '2 mins ago',
      read: false,
    },
    {
      id: 2,
      type: 'security',
      title: 'New Device Login',
      message: 'A new login detected from Windhoek, Namibia.',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 3,
      type: 'doc',
      title: 'Document Verified',
      message: 'Your Proof of Income has been verified by the admin.',
      time: '5 hours ago',
      read: true,
    },
    {
      id: 4,
      type: 'loan',
      title: 'Loan Offer',
      message: 'You are eligible for a top-up of N$ 5,000.',
      time: '1 day ago',
      read: true,
    },
  ];

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'payment':
        return <DollarSign size={14} />;
      case 'security':
        return <ShieldAlert size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  const getNotificationColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'payment':
        return 'bg-emerald-500/20 text-emerald-500';
      case 'security':
        return 'bg-rose-500/20 text-rose-500';
      default:
        return 'bg-blue-500/20 text-blue-500';
    }
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/20 backdrop-blur-sm z-[80] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        data-testid="notification-backdrop"
      />

      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[min(350px,calc(100vw-0.75rem))] z-[90]',
          'transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        data-testid="notification-panel"
      >
        <div
          className={cn(
            'h-full w-full flex flex-col shadow-2xl border-l relative overflow-hidden',
            styles.cardClass,
            styles.borderClass
          )}
        >
          {styles.variant === 'glass' && (
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          )}
          {styles.variant === 'lux' && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          )}
          <div className={cn('p-6 flex justify-between items-center border-b', styles.borderClass)}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className={styles.textClass} size={20} />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
              </div>
              <h3 className={cn('font-bold text-lg', styles.textClass)}>Notifications</h3>
            </div>
            <button
              onClick={onClose}
              className={cn('p-2 rounded-full hover:bg-white/10', styles.textClass)}
              data-testid="notification-close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  'p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer',
                  notif.read
                    ? 'border-transparent bg-transparent opacity-60'
                    : styles.variant === 'glass'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-black/5 border-black/5 dark:border-white/10'
                )}
                data-testid={`notification-item-${notif.id}`}
              >
                <div className="flex gap-3">
                  <div
                    className={cn('mt-1 p-2 rounded-full h-fit', getNotificationColor(notif.type))}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div>
                    <h4 className={cn('text-sm font-semibold', styles.textClass)}>{notif.title}</h4>
                    <p className={cn('text-xs opacity-70 mt-1 leading-relaxed', styles.textClass)}>
                      {notif.message}
                    </p>
                    <span className={cn('text-[10px] opacity-40 mt-2 block', styles.textClass)}>
                      {notif.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={cn('p-4 border-t', styles.borderClass)}>
            <ThemedButton variant="secondary" className="w-full text-sm">
              Mark all as read
            </ThemedButton>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
