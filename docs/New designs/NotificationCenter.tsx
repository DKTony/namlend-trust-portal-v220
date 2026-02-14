import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Bell, DollarSign, FileText, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { styles } = useTheme();

  const notifications = [
    { id: 1, type: 'payment', title: 'Payment Received', message: 'Your payment of N$ 1,200 has been processed via IPS.', time: '2 mins ago', read: false },
    { id: 2, type: 'security', title: 'New Device Login', message: 'A new login detected from Windhoek, Namibia.', time: '1 hour ago', read: false },
    { id: 3, type: 'doc', title: 'Document Verified', message: 'Your Proof of Income has been verified by the admin.', time: '5 hours ago', read: true },
    { id: 4, type: 'loan', title: 'Loan Offer', message: 'You are eligible for a top-up of N$ 5,000.', time: '1 day ago', read: true },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[80] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`
         fixed top-0 right-0 h-full w-[350px] z-[90]
         transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)
         ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
         <div className={`h-full w-full flex flex-col shadow-2xl ${styles.cardClass} border-l ${styles.borderClass}`}>
            
            {/* Header */}
            <div className={`p-6 flex justify-between items-center border-b ${styles.borderClass}`}>
              <div className="flex items-center gap-3">
                 <div className="relative">
                    <Bell className={styles.textClass} size={20} />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                 </div>
                 <h3 className={`font-bold text-lg ${styles.textClass}`}>Notifications</h3>
              </div>
              <button onClick={onClose} className={`p-2 rounded-full hover:bg-white/10 ${styles.textClass}`}>
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {notifications.map((notif) => (
                 <div 
                   key={notif.id}
                   className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer ${notif.read ? 'border-transparent bg-transparent opacity-60' : `${styles.variant === 'glass' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5 dark:border-white/10'}`}`}
                 >
                    <div className="flex gap-3">
                       <div className={`mt-1 p-2 rounded-full h-fit ${
                          notif.type === 'payment' ? 'bg-emerald-500/20 text-emerald-500' :
                          notif.type === 'security' ? 'bg-rose-500/20 text-rose-500' :
                          'bg-blue-500/20 text-blue-500'
                       }`}>
                          {notif.type === 'payment' && <DollarSign size={14} />}
                          {notif.type === 'security' && <ShieldAlert size={14} />}
                          {(notif.type === 'doc' || notif.type === 'loan') && <FileText size={14} />}
                       </div>
                       <div>
                          <h4 className={`text-sm font-semibold ${styles.textClass}`}>{notif.title}</h4>
                          <p className={`text-xs opacity-70 mt-1 leading-relaxed ${styles.textClass}`}>{notif.message}</p>
                          <span className={`text-[10px] opacity-40 mt-2 block ${styles.textClass}`}>{notif.time}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t ${styles.borderClass}`}>
               <Button variant="secondary" className="w-full text-sm">Mark all as read</Button>
            </div>

         </div>
      </div>
    </>
  );
};