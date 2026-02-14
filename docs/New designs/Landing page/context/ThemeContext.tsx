import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeVariant, ThemeConfig, ThemeContextType } from '../types';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const getThemeStyles = (variant: ThemeVariant, dark: boolean): ThemeConfig => {
  switch (variant) {
    case 'lux':
      return {
        name: 'Midnight Lux',
        variant: 'lux',
        background: dark ? 'bg-[#050505]' : 'bg-[#f8f8f8]',
        cardClass: dark 
          ? 'bg-[#0a0a0a] border border-amber-500/20 shadow-2xl shadow-black rounded-xl' 
          : 'bg-white border border-amber-900/10 shadow-xl shadow-amber-900/5 rounded-xl',
        textClass: dark ? 'text-amber-50/90 font-serif tracking-wide' : 'text-slate-900 font-serif tracking-wide',
        accentClass: 'bg-gradient-to-r from-amber-700 to-amber-500 text-white shadow-lg shadow-amber-500/20',
        borderClass: dark ? 'border-amber-500/20' : 'border-amber-900/10',
        buttonClass: dark
          ? 'bg-[#151515] border border-amber-500/30 text-amber-50 hover:border-amber-400 transition-colors rounded-lg uppercase tracking-widest text-xs'
          : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 rounded-lg uppercase tracking-widest text-xs',
        inputClass: dark 
          ? 'bg-[#151515] border-amber-500/30 text-amber-50 focus:border-amber-400' 
          : 'bg-white border-amber-900/10 text-slate-900 focus:border-amber-600/30'
      };
    case 'neo':
      return {
        name: 'Neo Pop',
        variant: 'neo',
        background: dark ? 'bg-zinc-900' : 'bg-[#FFFBEB]', // Warm yellow tint for light mode
        cardClass: dark 
          ? 'bg-zinc-800 border-2 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] rounded-none' 
          : 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none',
        textClass: dark ? 'text-white font-mono' : 'text-black font-mono',
        accentClass: dark
          ? 'bg-[#A855F7] border-2 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all font-bold'
          : 'bg-[#A855F7] border-2 border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold',
        borderClass: dark ? 'border-zinc-700' : 'border-black',
        buttonClass: dark
          ? 'bg-zinc-700 border-2 border-white text-white hover:bg-zinc-600 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all rounded-none'
          : 'bg-[#bef264] border-2 border-black text-black hover:bg-[#a3e635] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none',
        inputClass: dark
          ? 'bg-zinc-800 border-2 border-white text-white focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] rounded-none'
          : 'bg-white border-2 border-black text-black focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none'
      };
    case 'glass':
    default:
      return {
        name: 'Deep Glass',
        variant: 'glass',
        background: dark ? 'bg-[#0f172a]' : 'bg-slate-50',
        cardClass: dark 
          ? 'bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-3xl' 
          : 'bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] rounded-3xl',
        textClass: dark ? 'text-slate-100 font-sans' : 'text-slate-800 font-sans',
        accentClass: 'bg-blue-600/90 backdrop-blur-md text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 rounded-full',
        borderClass: dark ? 'border-white/10' : 'border-white/20',
        buttonClass: dark 
          ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md rounded-2xl'
          : 'bg-white/40 hover:bg-white/60 border border-white/20 text-slate-900 backdrop-blur-md rounded-2xl',
        inputClass: dark 
          ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:bg-white/10 rounded-xl' 
          : 'bg-white/50 border border-white/20 text-slate-800 placeholder:text-slate-500 focus:bg-white/80 rounded-xl'
      };
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeVariant>('neo');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleDarkMode = () => setIsDark(!isDark);
  const styles = getThemeStyles(theme, isDark);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleDarkMode, styles }}>
      {children}
    </ThemeContext.Provider>
  );
};