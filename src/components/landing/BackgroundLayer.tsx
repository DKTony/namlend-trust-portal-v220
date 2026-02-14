import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const BackgroundLayer: React.FC = () => {
  const { theme, styles, isDark } = useTheme();

  return (
    <div className={cn(
      'fixed inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-500',
      styles.background
    )}>
      {theme === 'glass' && (
        <div className="absolute inset-0 opacity-40 dark:opacity-20">
          <div 
            className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500 rounded-full blur-[120px] animate-aurora mix-blend-multiply dark:mix-blend-screen" 
          />
          <div 
            className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-500 rounded-full blur-[120px] animate-aurora mix-blend-multiply dark:mix-blend-screen" 
            style={{ animationDelay: '-10s' }} 
          />
          <div 
            className="absolute inset-0 opacity-[0.05]" 
            style={{ filter: 'url(#noiseFilter)' }} 
          />
        </div>
      )}

      {theme === 'lux' && (
        <>
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ 
              backgroundImage: isDark 
                ? 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)' 
                : 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }} 
          />
          <div className="absolute top-0 right-0 w-full h-[800px] bg-gradient-to-b from-amber-500/10 to-transparent" />
        </>
      )}

      {theme === 'neo' && (
        <div 
          className="absolute inset-0 opacity-[0.15]" 
          style={{ 
            backgroundImage: isDark 
              ? 'radial-gradient(#fff 2px, transparent 2px)' 
              : 'radial-gradient(#000 2px, transparent 2px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
      )}
    </div>
  );
};

export default BackgroundLayer;
