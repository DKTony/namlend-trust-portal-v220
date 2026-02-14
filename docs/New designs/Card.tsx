import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, hoverEffect = true, style }) => {
  const { styles } = useTheme();

  return (
    <div 
      onClick={onClick}
      style={style}
      className={`
        relative rounded-3xl p-6 transition-all duration-500 ease-out
        ${styles.cardClass}
        ${styles.textClass}
        ${hoverEffect ? 'hover:-translate-y-2 hover:shadow-2xl cursor-pointer group' : ''}
        ${className}
      `}
    >
      {/* Glossy reflection effect for Glass theme */}
      {styles.variant === 'glass' && (
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      
      {/* Gold glow for Lux theme */}
      {styles.variant === 'lux' && (
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-sm" />
      )}

      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};