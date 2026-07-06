/**
 * Themed Sidebar Component
 * NamLend Premium Design System (NPDS) - NextGen
 * Drawer-style navigation with 3D tilt effect and theme-aware styling
 */

import { useBrandingSafe } from '@/context/BrandingContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface ThemedSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  variant?: 'client' | 'admin';
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
  menuItems?: MenuItem[];
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  title?: string;
  subtitle?: string;
  displayMode?: 'drawer' | 'rail' | 'sidebar';
}

export const ThemedSidebar: React.FC<ThemedSidebarProps> = ({
  currentPage,
  onNavigate,
  variant = 'client',
  userName = 'Client User',
  userEmail = 'client@namlend.com',
  onSignOut,
  menuItems: propMenuItems,
  isOpen: propIsOpen,
  onClose: propOnClose,
  onOpen: propOnOpen,
  title = 'NamLend',
  subtitle,
  displayMode = 'drawer',
}) => {
  const { styles, isDark } = useTheme();
  const { config: brandingConfig } = useBrandingSafe();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  // Handle controlled vs uncontrolled state
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (propOnClose && !open) propOnClose();
    if (propOnOpen && open) propOnOpen();
    if (propIsOpen === undefined) setInternalIsOpen(open);
  };

  // Reset rotation when closed
  useEffect(() => {
    if (!isOpen) {
      setRotate({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sidebarRef.current) return;

    const rect = sidebarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRotation = ((y - rect.height / 2) / rect.height) * -4;
    const yRotation = ((x - rect.width / 2) / rect.width) * 4;

    setRotate({ x: xRotation, y: yRotation });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const defaultClientMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Overview', id: 'dashboard' },
    { icon: Wallet, label: 'My Loans', id: 'loans' },
    { icon: ClipboardList, label: 'Applications', id: 'applications' },
    { icon: CreditCard, label: 'Payments', id: 'payments' },
    { icon: Landmark, label: 'Banking', id: 'banking' },
    { icon: PieChart, label: 'Budget & Finance', id: 'budget' },
    { icon: FileText, label: 'Documents', id: 'documents' },
    { icon: Users, label: 'Self Service', id: 'self-service' },
    { icon: Settings, label: 'Profile', id: 'profile' },
  ];

  const defaultAdminMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
    { icon: Users, label: 'Clients', id: 'clients' },
    { icon: Wallet, label: 'Loans', id: 'loans' },
    { icon: CreditCard, label: 'Payments', id: 'payments' },
    { icon: BarChart3, label: 'Reports', id: 'reports' },
    { icon: ShieldCheck, label: 'Security', id: 'security' },
    { icon: Settings, label: 'Settings', id: 'settings' },
  ];

  const menuItems =
    propMenuItems || (variant === 'admin' ? defaultAdminMenuItems : defaultClientMenuItems);

  // Use branding config for display values, with prop overrides
  const displayTitle = title !== 'NamLend' ? title : brandingConfig.general.company_name;
  const displaySubtitle =
    subtitle || (variant === 'admin' ? 'Admin Portal' : brandingConfig.general.company_tagline);

  const handleNavigation = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
  };

  const renderBrand = (compact = false) => (
    <div className={cn('flex items-center gap-3', compact ? 'mb-4 justify-center' : 'mb-10 mt-2')}>
      {brandingConfig.assets.logo_url ? (
        <img
          src={brandingConfig.assets.logo_url}
          alt={displayTitle}
          style={{
            width: Math.min(brandingConfig.assets.logo_width, compact ? 36 : 48),
            height: Math.min(brandingConfig.assets.logo_height, compact ? 36 : 48),
          }}
          className="object-contain"
        />
      ) : (
        <div
          className={cn(
            compact ? 'h-10 w-10' : 'w-10 h-10',
            'rounded-xl flex items-center justify-center shadow-lg',
            styles.accentClass
          )}
        >
          <ShieldCheck size={compact ? 20 : 24} className="text-white" />
        </div>
      )}
      {!compact &&
        (brandingConfig.assets.show_company_name_with_logo || !brandingConfig.assets.logo_url) && (
          <div className="min-w-0">
            <h1 className={cn('font-bold text-xl truncate', styles.textClass)} title={displayTitle}>
              {displayTitle}
            </h1>
            <p
              className={cn('text-xs opacity-60 truncate', styles.textClass)}
              title={displaySubtitle}
            >
              {displaySubtitle}
            </p>
          </div>
        )}
    </div>
  );

  const renderMenuItems = (compact = false) => (
    <div
      className={cn(
        'flex-1 flex flex-col overflow-y-auto scrollbar-none',
        compact ? 'gap-2' : 'gap-2'
      )}
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active =
          currentPage === item.id || (currentPage === 'overview' && item.id === 'dashboard');

        return (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.id)}
            className={cn(
              'flex min-h-11 items-center rounded-xl transition-all duration-300 group relative overflow-hidden',
              compact ? 'justify-center p-3' : 'gap-4 p-4',
              active
                ? `${styles.accentClass} shadow-md`
                : `hover:bg-white/5 ${styles.textClass} opacity-70 hover:opacity-100`
            )}
            data-testid={`sidebar-nav-${item.id}`}
            title={item.label}
            aria-label={item.label}
          >
            <div
              className={cn(
                'relative z-10 flex items-center',
                compact ? 'justify-center' : 'gap-4'
              )}
            >
              <Icon size={20} />
              {!compact && <span className="font-medium">{item.label}</span>}
            </div>
            {!active && !compact && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
            {active && styles.variant === 'lux' && (
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 animate-pulse pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );

  const renderUserFooter = (compact = false) => (
    <div
      className={cn(
        'mt-auto flex items-center gap-3 backdrop-blur-md',
        compact ? 'justify-center rounded-xl p-2' : 'p-4 rounded-2xl',
        styles.variant === 'glass' ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
          styles.accentClass
        )}
      >
        {userName?.charAt(0).toUpperCase() || 'U'}
      </div>
      {!compact && (
        <>
          <div className="overflow-hidden flex-1">
            <p className={cn('text-sm font-semibold truncate', styles.textClass)} title={userName}>
              {userName}
            </p>
            <p className={cn('text-xs opacity-60 truncate', styles.textClass)} title={userEmail}>
              {userEmail}
            </p>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className={cn('ml-auto p-2 rounded-lg hover:bg-white/10', styles.textClass)}
              data-testid="sidebar-signout"
              aria-label="Sign Out"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </>
      )}
    </div>
  );

  if (displayMode !== 'drawer') {
    const compact = displayMode === 'rail';

    return (
      <aside
        className={cn(
          'hidden h-dvh shrink-0 border-r border-border/60 p-3 md:flex',
          compact ? 'w-20' : 'w-72 p-4'
        )}
        data-testid={compact ? 'sidebar-rail' : 'sidebar-desktop'}
      >
        <div
          className={cn(
            'relative flex h-full w-full flex-col overflow-hidden',
            compact ? 'rounded-2xl p-2' : 'rounded-3xl p-5',
            styles.cardClass,
            isDark ? 'border-white/10' : 'border-black/5'
          )}
        >
          {renderBrand(compact)}
          {renderMenuItems(compact)}
          {renderUserFooter(compact)}
        </div>
      </aside>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed top-4 left-4 z-[60] w-10 h-10 flex items-center justify-center',
          'rounded-full shadow-sm transition-transform hover:scale-105 active:scale-95',
          'backdrop-blur-md border border-white/10',
          styles.variant === 'glass'
            ? 'bg-white/20 text-white'
            : 'bg-black/10 dark:bg-white/10 text-inherit',
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        )}
        data-testid="sidebar-trigger"
      >
        <Menu size={20} />
      </button>

      <div
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-[65] transition-opacity duration-500 motion-reduce:transition-none',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
        data-testid="sidebar-backdrop"
      />

      <div
        ref={sidebarRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isOpen
            ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateX(0)`
            : 'translateX(-120%)',
        }}
        className="fixed left-0 top-0 h-dvh w-[min(20rem,calc(100vw-0.75rem))] p-3 sm:p-6 z-[70] transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none"
        data-testid="sidebar-drawer"
      >
        <div
          className={cn(
            'relative flex flex-col h-full rounded-3xl p-6 shadow-2xl overflow-hidden',
            styles.cardClass,
            isDark ? 'border-white/10' : 'border-black/5'
          )}
        >
          <div
            className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-30 pointer-events-none"
            style={{ transform: `translateX(${rotate.y * 10}px) translateY(${rotate.x * 10}px)` }}
          />

          <button
            onClick={() => setIsOpen(false)}
            className={cn(
              'absolute top-4 right-4 p-2 rounded-full hover:bg-white/10',
              styles.textClass
            )}
            data-testid="sidebar-close"
          >
            <X size={20} />
          </button>

          {renderBrand(false)}
          {renderMenuItems(false)}
          {renderUserFooter(false)}
        </div>
      </div>
    </>
  );
};

export default ThemedSidebar;
