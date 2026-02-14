import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Sparkles, Gem, Layers, Palette } from 'lucide-react';
import { Card } from '../ui/Card';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, isDark, toggleDarkMode, styles } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="fixed bottom-8 right-8 z-50 flex items-center justify-end"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <Card 
        className={`
          flex items-center gap-2 !rounded-full backdrop-blur-2xl transition-all duration-500 ease-in-out overflow-hidden
          ${isExpanded ? '!px-3 !py-2 shadow-2xl scale-100 opacity-100' : '!p-3 w-[52px] h-[52px] shadow-lg hover:shadow-xl opacity-70 hover:opacity-100'}
        `} 
        hoverEffect={false}
      >
        {/* Toggle / Icon State */}
        {!isExpanded && (
           <div className="absolute inset-0 flex items-center justify-center text-white/80">
              <Palette size={24} className={isDark ? 'text-white' : 'text-slate-800'} />
           </div>
        )}

        <div className={`flex items-center gap-2 transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 absolute pointer-events-none'}`}>
            <button
            onClick={() => toggleDarkMode()}
            className={`p-2 rounded-full transition-all duration-300 ${styles.buttonClass}`}
            title="Toggle Dark Mode"
            >
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className={`w-px h-5 mx-1 ${styles.variant === 'glass' ? 'bg-white/20' : 'bg-zinc-500/20'}`} />

            <button
            onClick={() => setTheme('glass')}
            className={`p-2 rounded-full transition-all duration-300 relative group ${theme === 'glass' ? styles.accentClass : styles.buttonClass}`}
            title="Glass Theme"
            >
            <Sparkles size={18} />
            </button>

            <button
            onClick={() => setTheme('lux')}
            className={`p-2 rounded-full transition-all duration-300 relative group ${theme === 'lux' ? styles.accentClass : styles.buttonClass}`}
            title="Lux Theme"
            >
            <Gem size={18} />
            </button>

            <button
            onClick={() => setTheme('neo')}
            className={`p-2 rounded-full transition-all duration-300 relative group ${theme === 'neo' ? styles.accentClass : styles.buttonClass}`}
            title="Neo Theme"
            >
            <Layers size={18} />
            </button>
        </div>
      </Card>
    </div>
  );
};