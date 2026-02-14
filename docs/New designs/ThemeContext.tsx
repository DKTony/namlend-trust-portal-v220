import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeVariant, ThemeConfig } from '../types';

interface ThemeContextType {
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  styles: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeVariant>('glass');
  const [isDark, setIsDark] = useState(true);

  // Apply dark mode class to html
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const getThemeStyles = (variant: ThemeVariant, dark: boolean): ThemeConfig => {
    switch (variant) {
      case 'glass':
        return {
          name: 'Icy Glass',
          variant: 'glass',
          background: dark 
            ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900' 
            : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
          cardClass: dark 
            ? 'bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]' 
            : 'bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]',
          textClass: dark ? 'text-slate-100' : 'text-slate-800',
          accentClass: 'bg-blue-500/80 backdrop-blur-md text-white',
          borderClass: dark ? 'border-white/10' : 'border-white/20',
          buttonClass: dark 
            ? 'bg-white/10 hover:bg-white/20 border border-white/10 text-white backdrop-blur-md'
            : 'bg-white/50 hover:bg-white/60 border border-white/20 text-slate-800 backdrop-blur-md'
        };
      case 'lux':
        return {
          name: 'Midnight Lux',
          variant: 'lux',
          background: dark ? 'bg-[#050505]' : 'bg-[#f0f0f0]',
          cardClass: dark 
            ? 'bg-[#0F1115] border border-amber-500/20 shadow-lg shadow-black/50' 
            : 'bg-white border border-amber-900/10 shadow-xl shadow-amber-900/5',
          textClass: dark ? 'text-amber-50/90' : 'text-slate-900',
          accentClass: 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/20',
          borderClass: dark ? 'border-amber-500/20' : 'border-amber-900/10',
          buttonClass: dark
            ? 'bg-[#1a1d24] border border-amber-500/30 text-amber-50 hover:border-amber-400 transition-colors'
            : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
        };
      case 'neo':
        return {
          name: 'Neo Fintech',
          variant: 'neo',
          background: dark ? 'bg-zinc-950' : 'bg-zinc-50',
          cardClass: dark 
            ? 'bg-zinc-900 border border-zinc-800' 
            : 'bg-white border border-zinc-200 shadow-sm',
          textClass: dark ? 'text-zinc-100' : 'text-zinc-900',
          accentClass: 'bg-emerald-600 text-white',
          borderClass: dark ? 'border-zinc-800' : 'border-zinc-200',
          buttonClass: dark
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
        };
    }
  };

  const styles = getThemeStyles(theme, isDark);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleDarkMode: () => setIsDark(!isDark), styles }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};