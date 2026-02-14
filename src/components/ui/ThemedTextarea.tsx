/**
 * Themed Textarea Component
 * Textarea with theme-aware styling from ThemeContext
 */

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export interface ThemedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const ThemedTextarea = React.forwardRef<HTMLTextAreaElement, ThemedTextareaProps>(
  ({ className, ...props }, ref) => {
    const { styles } = useTheme();

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200",
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
ThemedTextarea.displayName = "ThemedTextarea";

export default ThemedTextarea;
