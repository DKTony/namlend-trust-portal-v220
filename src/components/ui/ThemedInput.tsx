/**
 * Themed Input Component
 * Input with theme-aware styling from ThemeContext
 */

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export interface ThemedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const ThemedInput = React.forwardRef<HTMLInputElement, ThemedInputProps>(
  ({ className, type, ...props }, ref) => {
    const { styles } = useTheme();

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200",
          styles.inputClass,
          styles.textClass,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
ThemedInput.displayName = "ThemedInput";

export default ThemedInput;
