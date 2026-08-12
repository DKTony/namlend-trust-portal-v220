/**
 * Themed Textarea Component
 *
 * A multi-line text input using the fixed OG border, background, and focus styling. Shares the
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

import { cn } from '@/lib/utils';
import React from 'react';

/**
 * Props for {@link ThemedTextarea}.
 *
 * Extends all native `TextareaHTMLAttributes`.
 */
export interface ThemedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const ThemedTextarea = React.forwardRef<HTMLTextAreaElement, ThemedTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200',
          'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20',
          'font-sans text-[#274F35]',
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
