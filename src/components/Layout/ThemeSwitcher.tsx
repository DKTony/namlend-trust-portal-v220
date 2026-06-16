/**
 * Theme Switcher Component
 * NamLend Premium Design System (NPDS) - NextGen
 * Floating glassmorphism pill that expands to reveal theme controls
 */

import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Gem, Layers, Moon, Palette, Sparkles, Sun } from 'lucide-react';
import React, { useState } from 'react';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, isDark, toggleDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center justify-end"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => setIsExpanded(!isExpanded)}
      data-testid="theme-switcher"
    >
      <div
        className={cn(
          'relative flex items-center gap-1.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'backdrop-blur-xl border shadow-2xl overflow-hidden',
          isExpanded
            ? 'px-2.5 py-2.5 rounded-[24px] bg-background/80 border-border/50 scale-100'
            : 'w-[56px] h-[56px] rounded-[20px] bg-primary/90 border-primary/20 scale-95 hover:scale-100 cursor-pointer'
        )}
      >
        {/* Collapsed State Icon */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-300',
            isExpanded ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          )}
        >
          <Palette size={24} className="text-primary-foreground" />
        </div>

        {/* Expanded Controls */}
        <div
          className={cn(
            'flex items-center gap-2 transition-all duration-500 ease-out',
            isExpanded
              ? 'opacity-100 translate-x-0 w-auto'
              : 'opacity-0 translate-x-10 w-0 pointer-events-none'
          )}
        >
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={cn(
              'p-2.5 rounded-xl transition-all duration-300 hover:bg-muted group relative overflow-hidden',
              isDark ? 'text-amber-400' : 'text-blue-500'
            )}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            data-testid="dark-mode-toggle"
          >
            <div className="relative z-10">{isDark ? <Sun size={18} /> : <Moon size={18} />}</div>
            <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Theme Variants */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
            <ThemeButton
              active={theme === 'neo'}
              onClick={() => setTheme('neo')}
              icon={Layers}
              label="Neo"
              color="text-emerald-500"
            />
            <ThemeButton
              active={theme === 'glass'}
              onClick={() => setTheme('glass')}
              icon={Sparkles}
              label="Glass"
              color="text-blue-500"
            />
            <ThemeButton
              active={theme === 'lux'}
              onClick={() => setTheme('lux')}
              icon={Gem}
              label="Lux"
              color="text-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  color: string;
}

const ThemeButton: React.FC<ThemeButtonProps> = ({ active, onClick, icon: Icon, label, color }) => (
  <button
    onClick={onClick}
    className={cn(
      'p-2 rounded-lg transition-all duration-300 relative group flex flex-col items-center justify-center w-[42px]',
      active ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-zinc-700/50'
    )}
    title={`${label} Theme`}
  >
    <Icon
      size={16}
      className={cn(
        'transition-colors',
        active
          ? color
          : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
      )}
    />
    <span
      className={cn(
        'text-[10px] font-semibold mt-0.5 transition-all',
        active
          ? 'text-zinc-800 dark:text-zinc-100'
          : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-100'
      )}
    >
      {label}
    </span>
    {active && (
      <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-zinc-200 dark:ring-zinc-600" />
    )}
  </button>
);

export default ThemeSwitcher;
