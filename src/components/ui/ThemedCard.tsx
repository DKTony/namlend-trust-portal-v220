/**
 * Themed Card Component
 * Card with theme-aware hover effects and glassmorphism support
 */

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({ 
  children, 
  className = '', 
  onClick, 
  hoverEffect = true, 
  style,
  'data-testid': dataTestId 
}) => {
  const { styles } = useTheme();

  return (
    <div 
      onClick={onClick}
      style={style}
      data-testid={dataTestId}
      className={cn(
        'relative p-6 transition-all duration-500 ease-out',
        styles.cardClass,
        styles.textClass,
        styles.radius,
        hoverEffect && styles.variant !== 'neo' && 'hover:-translate-y-2 hover:shadow-2xl cursor-pointer group',
        hoverEffect && styles.variant === 'neo' && 'cursor-pointer group active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:shadow-md',
        className
      )}
    >
      {styles.variant === 'glass' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-70" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          <div className="absolute -inset-full h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-0 group-hover:animate-shine pointer-events-none" />
        </>
      )}
      
      {styles.variant === 'glass' && (
        <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      
      {styles.variant === 'lux' && (
        <div className="absolute -inset-[1px] rounded-[inherit] bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-sm" />
      )}

      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default ThemedCard;
