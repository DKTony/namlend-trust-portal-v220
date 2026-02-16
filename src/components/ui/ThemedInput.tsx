/**
 * Themed Input Component
 *
 * A form input that inherits its border, background, and focus-ring styling
 * from the active theme via `useTheme().styles.inputClass`. It applies
 * the theme-defined text colour and supports all native `<input>` attributes
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

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * Props for {@link ThemedInput}.
 *
 * Extends all native `InputHTMLAttributes`. Theme styling is applied
 * automatically — pass additional `className` to extend or override.
 */
export interface ThemedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const ThemedInput = React.forwardRef<HTMLInputElement, ThemedInputProps>(
  ({ className, type, ...props }, ref) => {
    const { styles } = useTheme();

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200',
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
ThemedInput.displayName = 'ThemedInput';

export default ThemedInput;
