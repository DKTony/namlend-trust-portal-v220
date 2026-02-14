/**
 * Themed Button Component
 * Button with theme-aware styling for glass/lux/neo variants
 * Wrapped with forwardRef for compatibility with Radix UI components
 */

import React, { forwardRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'default';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export const ThemedButton = forwardRef<HTMLButtonElement, ThemedButtonProps>(
  ({ variant = 'primary', size = 'default', children, className = '', ...props }, ref) => {
    const { styles, theme } = useTheme();

    let variantClass = '';
    
    switch (variant) {
      case 'primary':
      case 'default':
        variantClass = `${styles.accentClass} hover:opacity-90 shadow-lg`;
        break;
      case 'secondary':
        variantClass = styles.buttonClass;
        break;
      case 'outline':
        variantClass = `bg-transparent border border-border hover:bg-accent hover:text-accent-foreground ${styles.textClass}`;
        break;
      case 'destructive':
        variantClass = 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
        break;
      case 'ghost':
      default:
        variantClass = `bg-transparent hover:bg-accent/10 ${styles.textClass}`;
        break;
    }

    const interactiveClass = theme === 'neo'
      ? 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:shadow-md'
      : 'active:scale-95 hover:shadow-xl hover:brightness-110';

    const sizeClasses = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    };

    return (
      <button 
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          styles.radius,
          variantClass,
          interactiveClass,
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ThemedButton.displayName = 'ThemedButton';

export default ThemedButton;
