/**
 * Themed Input Component
 *
 * A form input using the fixed OG border, background, and focus styling. It supports all native `<input>` attributes
 * (including `type="file"` for document uploads).
 *
 * Wrapped with `forwardRef` so it works with React Hook Form's `register()`
 * and other ref-based form libraries.
 *
 * @example
 * ```tsx
 * import { ThemedInput } from '@/components/ui/ThemedInput';
 *
 * // Basic text input
 * <ThemedInput placeholder="Full name" {...register('fullName')} />
 *
 * // File input (used in KYC document upload)
 * <ThemedInput type="file" accept=".pdf,.jpg,.png" onChange={handleUpload} />
 * ```
 */

import { cn } from '@/lib/utils';
import React from 'react';

/**
 * Props for {@link ThemedInput}.
 *
 * Extends all native `InputHTMLAttributes`.
 */
export interface ThemedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const ThemedInput = React.forwardRef<HTMLInputElement, ThemedInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200',
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
ThemedInput.displayName = 'ThemedInput';

export default ThemedInput;
