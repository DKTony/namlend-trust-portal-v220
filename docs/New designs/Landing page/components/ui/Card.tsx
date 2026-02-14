import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hoverEffect = false,
  onClick
}) => {
  const { styles, theme } = useTheme();

  // Theme-specific hover physics
  let hoverClass = '';
  if (hoverEffect) {
    if (theme === 'neo') {
      hoverClass = 'cursor-pointer group hover:-translate-y-1 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200';
    } else {
      hoverClass = 'cursor-pointer group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-out';
    }
  }

  return (
    <div 
      className={`
        relative overflow-hidden
        ${styles.cardClass}
        ${styles.textClass}
        ${hoverClass}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Visual Effects Layer */}
      {theme === 'glass' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
          <div className="absolute -inset-full h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-0 group-hover:opacity-10 group-hover:animate-shine pointer-events-none" />
        </>
      )}
      
      {theme === 'lux' && hoverEffect && (
        <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none" />
      )}

      {/* Content Layer */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};

export default Card;