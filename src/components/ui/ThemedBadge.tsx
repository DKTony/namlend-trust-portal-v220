/**
 * Themed Badge Component
 * Badge with theme-aware styling from ThemeContext
 */

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { BadgeProps } from './badge';

interface ThemedBadgeProps extends Omit<BadgeProps, 'variant'> {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
}

export const ThemedBadge: React.FC<ThemedBadgeProps> = ({ 
  className, 
  variant = 'default',
  children,
  ...props 
}) => {
  const { styles } = useTheme();

  // If specific variants are requested that aren't the default theme badge,
  // we can handle them here or fall back to standard styling with theme radius
  
  return (
    <div 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        styles.badgeClass,
        styles.radius === 'rounded-3xl' ? 'rounded-full' : styles.radius, // badges usually rounder than cards
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default ThemedBadge;
