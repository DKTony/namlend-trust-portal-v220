import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, Moon, Sun } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, isDark, toggleDarkMode } = useTheme();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end">
      
      {/* Theme Switcher */}
      <div className="bg-white dark:bg-zinc-800 p-2 rounded-full shadow-lg border border-gray-200 dark:border-zinc-700 flex gap-1">
         {(['glass', 'lux', 'neo'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${
                theme === t 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700'
              }`}
            >
              {t}
            </button>
         ))}
      </div>

      {/* Dark Mode Toggle */}
      <button 
        onClick={toggleDarkMode}
        className="p-4 bg-blue-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
      >
        {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

    </div>
  );
};

export default ThemeToggle;