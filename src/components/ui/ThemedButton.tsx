/**
 * Themed Button Component
 *
 * A theme-aware button that adapts its styling based on the active design theme
 * (glass, lux, or neo). Wrapped with `forwardRef` for seamless integration with
 * Radix UI primitives and other ref-forwarding components.
 *
 * Interaction behaviour differs per theme:
 * - **glass/lux**: `active:scale-95` press effect with brightness increase on hover.
 * - **neo**: Brutalist `translate-x/y` offset on press with flat shadow on hover.
 *
 * @example
 * ```tsx
 * import { ThemedButton } from '@/components/ui/ThemedButton';
 *
 * // Primary action
 * <ThemedButton variant="primary" size="lg" onClick={handleSubmit}>
 *   Submit Application
 * </ThemedButton>
 *
 * // Icon-only button
 * <ThemedButton variant="ghost" size="icon" aria-label="Close">
 *   <X className="h-4 w-4" />
 * </ThemedButton>
 *
 * // Outline variant for secondary actions
 * <ThemedButton variant="outline">Cancel</ThemedButton>
 * ```
 */

import React, { forwardRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * Props for {@link ThemedButton}.
 *
 * @prop variant - Visual style of the button.
 *   - `'primary'` / `'default'` — Accent colour background with shadow (CTA).
 *   - `'secondary'` — Theme-defined `buttonClass` (muted).
 *   - `'outline'` — Transparent with border; accent on hover.
 *   - `'destructive'` — Red background for dangerous actions.
 *   - `'ghost'` — No background; subtle hover highlight.
 * @prop size - Controls height and padding.
 *   - `'default'` — `h-10 px-4 py-2`.
 *   - `'sm'` — `h-9 px-3`, compact.
 *   - `'lg'` — `h-11 px-8`, roomy.
 *   - `'icon'` — `h-10 w-10`, square icon button.
 * @prop children - Button content (text, icon, or mixed).
 */
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

    const interactiveClass =
      theme === 'neo'
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
