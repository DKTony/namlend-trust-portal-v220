/**
 * Grouped Sidebar Component
 * NamLend Premium Design System (NPDS) - NextGen
 * Drawer-style navigation with collapsible groups, route-based active state,
 * and the same 3D tilt effect from ThemedSidebar.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useBrandingSafe } from '@/context/BrandingContext';
import { cn } from '@/lib/utils';
import { ShieldCheck, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import type { NavGroup } from '@/types/navigation';

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
        className="fixed left-0 top-0 h-screen w-80 p-6 z-[70] transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
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

          {/* Branding header */}
          <div className="flex items-center gap-3 mb-8 mt-2">
            {brandingConfig.assets.logo_url ? (
              <img
                src={brandingConfig.assets.logo_url}
                alt={displayTitle}
                style={{
                  width: Math.min(brandingConfig.assets.logo_width, 48),
                  height: Math.min(brandingConfig.assets.logo_height, 48),
                }}
                className="object-contain"
              />
            ) : (
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shadow-lg',
                  styles.accentClass
                )}
              >
                <ShieldCheck size={24} className="text-white" />
              </div>
            )}
            {(brandingConfig.assets.show_company_name_with_logo ||
              !brandingConfig.assets.logo_url) && (
              <div>
                <h1 className={cn('font-bold text-xl', styles.textClass)}>{displayTitle}</h1>
                <p className={cn('text-xs opacity-60', styles.textClass)}>{displaySubtitle}</p>
              </div>
            )}
          </div>

          {/* Nav groups */}
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {groups.map((group) => {
              const isCollapsed = !!collapsed[group.id];
              const hasActiveItem = group.items.some((item) => location.pathname === item.path);

              return (
                <div key={group.id}>
                  {/* Group header — skip for single-item "overview" group */}
                  {group.items.length > 1 && (
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors',
                        hasActiveItem
                          ? 'text-sky-400'
                          : `${styles.textClass} opacity-50 hover:opacity-70`
                      )}
                    >
                      {group.label}
                      <ChevronDown
                        size={14}
                        className={cn(
                          'transition-transform duration-200',
                          isCollapsed && '-rotate-90'
                        )}
                      />
                    </button>
                  )}

                  {/* Group items */}
                  {!isCollapsed && (
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.id}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden',
                                isActive
                                  ? `${styles.accentClass} shadow-md`
                                  : `hover:bg-white/5 ${styles.textClass} opacity-70 hover:opacity-100`
                              )
                            }
                            data-testid={`sidebar-nav-${item.id}`}
                          >
                            {({ isActive }) => (
                              <>
                                <div className="relative z-10 flex items-center gap-4">
                                  <Icon size={20} />
                                  <span className="font-medium text-sm">{item.label}</span>
                                </div>
                                {!isActive && (
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

          {/* User footer */}
          <div
            className={cn(
              'mt-auto p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md',
              styles.variant === 'glass' ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                styles.accentClass
              )}
            >
              {userName?.charAt(0).toUpperCase() || 'U'}
            </div>
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
          </div>
        </div>
      </div>
    </>
  );
};

export default GroupedSidebar;
