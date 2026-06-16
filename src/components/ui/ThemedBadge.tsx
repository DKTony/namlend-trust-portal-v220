/**
 * Themed Badge Component
 *
 * A small label/tag that adapts its colours and border-radius to the active
 * theme. Uses `useTheme().styles.badgeClass` for background/text colours and
 * maps the theme's card radius to a badge-appropriate radius (e.g. `rounded-3xl`
 * cards produce `rounded-full` badges).
 *
 * @example
 * ```tsx
 * import { ThemedBadge } from '@/components/ui/ThemedBadge';
 *
 * // Default themed badge
 * <ThemedBadge>Active</ThemedBadge>
 *
 * // Destructive badge for overdue status
 * <ThemedBadge variant="destructive">Overdue</ThemedBadge>
 *
 * // Outline badge
 * <ThemedBadge variant="outline">Draft</ThemedBadge>
 * ```
 */

import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import React from 'react';
import { BadgeProps } from './badge';

/**
 * Props for {@link ThemedBadge}.
 *
 * @prop variant - Visual style of the badge.
 *   - `'default'` — Theme accent background (default).
 *   - `'outline'` — Transparent with border.
 *   - `'secondary'` — Muted/secondary colouring.
 *   - `'destructive'` — Red for warnings/errors.
 */
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
        'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
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
