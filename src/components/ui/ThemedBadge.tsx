/**
 * Themed Badge Component
 *
 * A small label/tag using the fixed OG identity colours.
 *
 * @example
 * ```tsx
 * import { ThemedBadge } from '@/components/ui/ThemedBadge';
 *
 * // Default badge
 * <ThemedBadge>Active</ThemedBadge>
 *
 * // Destructive badge for overdue status
 * <ThemedBadge variant="destructive">Overdue</ThemedBadge>
 *
 * // Outline badge
 * <ThemedBadge variant="outline">Draft</ThemedBadge>
 * ```
 */

import { cn } from '@/lib/utils';
import React from 'react';
import { BadgeProps } from './badge';

/**
 * Props for {@link ThemedBadge}.
 *
 * @prop variant - Visual style of the badge.
 *   - `'default'` — OG green background (default).
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
  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'rounded-full border border-[#B9CCB3] bg-[#EEF5EB] text-[#274F35]',
        'rounded-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default ThemedBadge;
