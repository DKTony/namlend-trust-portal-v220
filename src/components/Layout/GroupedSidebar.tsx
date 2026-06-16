/**
 * Grouped Sidebar Component
 * NamLend Premium Design System (NPDS) - NextGen
 * Drawer-style navigation with collapsible groups, route-based active state,
 * and the same 3D tilt effect from ThemedSidebar.
 */

import { useBrandingSafe } from '@/context/BrandingContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { NavGroup } from '@/types/navigation';
import { ChevronDown, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface GroupedSidebarProps {
  groups: NavGroup[];
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  title?: string;
  subtitle?: string;
  displayMode?: 'drawer' | 'rail' | 'sidebar';
}

const STORAGE_KEY = 'admin-sidebar-groups';

function loadCollapsedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsedState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const GroupedSidebar: React.FC<GroupedSidebarProps> = ({
  groups,
  userName = 'Admin User',
  userEmail = 'admin@namlend.com',
  onSignOut,
  isOpen: propIsOpen,
  onClose: propOnClose,
  onOpen: propOnOpen,
  title = 'NamLend Admin',
  subtitle = 'Admin Portal',
  displayMode = 'drawer',
}) => {
  const { styles, isDark } = useTheme();
  const { config: brandingConfig } = useBrandingSafe();
  const location = useLocation();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsedState);

  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = useCallback(
    (open: boolean) => {
      if (propOnClose && !open) propOnClose();
      if (propOnOpen && open) propOnOpen();
      if (propIsOpen === undefined) setInternalIsOpen(open);
    },
    [propIsOpen, propOnClose, propOnOpen]
  );

  useEffect(() => {
    if (!isOpen) setRotate({ x: 0, y: 0 });
  }, [isOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sidebarRef.current) return;
    const rect = sidebarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRotate({
      x: ((y - rect.height / 2) / rect.height) * -4,
      y: ((x - rect.width / 2) / rect.width) * 4,
    });
  };

  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  const toggleGroup = (groupId: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      saveCollapsedState(next);
      return next;
    });
  };

  // Auto-expand the group containing the active route
  useEffect(() => {
    for (const group of groups) {
      if (group.items.some((item) => location.pathname === item.path)) {
        if (collapsed[group.id]) {
          setCollapsed((prev) => {
            const next = { ...prev, [group.id]: false };
            saveCollapsedState(next);
            return next;
          });
        }
        break;
      }
    }
    // Only on location change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const displayTitle = title !== 'NamLend Admin' ? title : brandingConfig.general.company_name;
  const displaySubtitle = subtitle || 'Admin Portal';

  const renderBrand = (compact = false) => (
    <div className={cn('flex items-center gap-3', compact ? 'mb-4 justify-center' : 'mb-8 mt-2')}>
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
            <h1 className={cn('font-bold text-xl truncate', styles.textClass)}>{displayTitle}</h1>
            <p className={cn('text-xs opacity-60 truncate', styles.textClass)}>{displaySubtitle}</p>
          </div>
        )}
    </div>
  );

  const renderNavGroups = (compact = false) => (
    <div
      className={cn(
        'flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-none',
        compact && 'gap-2'
      )}
    >
      {groups.map((group) => {
        const isCollapsed = !!collapsed[group.id];
        const hasActiveItem = group.items.some((item) => location.pathname === item.path);

        return (
          <div key={group.id}>
            {!compact && group.items.length > 1 && (
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex min-h-9 items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors',
                  hasActiveItem ? 'text-sky-400' : `${styles.textClass} opacity-50 hover:opacity-70`
                )}
              >
                {group.label}
                <ChevronDown
                  size={14}
                  className={cn('transition-transform duration-200', isCollapsed && '-rotate-90')}
                />
              </button>
            )}

            {(!isCollapsed || compact) && (
              <div className={cn('flex flex-col gap-0.5', compact && 'gap-2')}>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-11 items-center rounded-xl transition-all duration-300 group relative overflow-hidden',
                          compact ? 'justify-center p-3' : 'gap-4 px-4 py-3',
                          isActive
                            ? `${styles.accentClass} shadow-md`
                            : `hover:bg-white/5 ${styles.textClass} opacity-70 hover:opacity-100`
                        )
                      }
                      data-testid={`sidebar-nav-${item.id}`}
                      title={item.label}
                      aria-label={item.label}
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={cn(
                              'relative z-10 flex items-center',
                              compact ? 'justify-center' : 'gap-4'
                            )}
                          >
                            <Icon size={20} />
                            {!compact && <span className="font-medium text-sm">{item.label}</span>}
                          </div>
                          {!isActive && !compact && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          )}
                          {isActive && styles.variant === 'lux' && (
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 animate-pulse pointer-events-none" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
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
            <p className={cn('text-sm font-semibold truncate', styles.textClass)}>{userName}</p>
            <p className={cn('text-xs opacity-60 truncate', styles.textClass)}>{userEmail}</p>
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
        data-testid={compact ? 'admin-sidebar-rail' : 'admin-sidebar-desktop'}
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
          {renderNavGroups(compact)}
          {renderUserFooter(compact)}
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Menu trigger */}
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

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm z-[65] transition-opacity duration-500',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
        data-testid="sidebar-backdrop"
      />

      {/* Drawer */}
      <div
        ref={sidebarRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isOpen
            ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateX(0)`
            : 'translateX(-120%)',
        }}
        className="fixed left-0 top-0 h-dvh w-[min(20rem,calc(100vw-0.75rem))] p-3 sm:p-6 z-[70] transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        data-testid="sidebar-drawer"
      >
        <div
          className={cn(
            'relative flex flex-col h-full rounded-3xl p-6 shadow-2xl overflow-hidden',
            styles.cardClass,
            isDark ? 'border-white/10' : 'border-black/5'
          )}
        >
          {/* Shine overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-30 pointer-events-none"
            style={{ transform: `translateX(${rotate.y * 10}px) translateY(${rotate.x * 10}px)` }}
          />

          {/* Close button */}
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
          {renderNavGroups(false)}
          {renderUserFooter(false)}
        </div>
      </div>
    </>
  );
};

export default GroupedSidebar;
