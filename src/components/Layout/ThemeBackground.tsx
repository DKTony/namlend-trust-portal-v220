/**
 * Theme Background Component
 * Implements the "Background & Visual Layers" from UI_DESIGN.md
 * Provides Aurora, Grid, and Dot Matrix backgrounds based on current theme
 */

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export const ThemeBackground: React.FC = () => {
  const { theme, isDark, styles } = useTheme();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base background color layer */}
      <div className={`absolute inset-0 transition-colors duration-500 ${styles.background}`} />

      {/* Glass Theme: Aurora Effect & Noise */}
      {theme === 'glass' && (
        <>
          <div className="absolute inset-0 opacity-40 dark:opacity-20">
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500 rounded-full blur-[120px] animate-aurora mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-500 rounded-full blur-[120px] animate-aurora mix-blend-screen" style={{ animationDelay: '-10s' }} />
            <div className="absolute top-[40%] left-[40%] w-[50%] h-[50%] bg-emerald-400 rounded-full blur-[120px] animate-pulse-slow" />
          </div>
          {/* Global Noise Overlay defined in CSS/SVG */}
          <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
          />
        </>
      )}

      {/* Lux Theme: Gold Grid & Gradient */}
      {theme === 'lux' && (
        <>
          <div className="absolute inset-0 opacity-[0.03]" 
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

      {/* Neo Theme: Dot Matrix */}
      {theme === 'neo' && (
        <div className="absolute inset-0 opacity-[0.1]" 
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

export default ThemeBackground;
