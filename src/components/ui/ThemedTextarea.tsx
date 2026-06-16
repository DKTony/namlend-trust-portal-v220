/**
 * Themed Textarea Component
 *
 * A multi-line text input that inherits border, background, and focus-ring
 * styling from the active theme via `useTheme().styles.inputClass`. Shares the
 * same visual language as {@link ThemedInput} but renders a `<textarea>`.
 *
 * Wrapped with `forwardRef` for React Hook Form compatibility.
 *
 * @example
 * ```tsx
 * import { ThemedTextarea } from '@/components/ui/ThemedTextarea';
 *
 * // Approval notes field
 * <ThemedTextarea
 *   placeholder="Add notes for this approval..."
 *   rows={4}
 *   {...register('notes')}
 * />
 * ```
 */

import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import React from 'react';

/**
 * Props for {@link ThemedTextarea}.
 *
 * Extends all native `TextareaHTMLAttributes`. Theme styling is applied
 * automatically — pass additional `className` to extend or override.
 */
export interface ThemedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const ThemedTextarea = React.forwardRef<HTMLTextAreaElement, ThemedTextareaProps>(
  ({ className, ...props }, ref) => {
    const { styles } = useTheme();

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200',
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
ThemedTextarea.displayName = 'ThemedTextarea';

export default ThemedTextarea;
