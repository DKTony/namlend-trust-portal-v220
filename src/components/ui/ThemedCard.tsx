/**
 * Themed Card Component
 *
 * A card using the immutable OG Financial Services presentation.
 *
 * Hover effects can be disabled for static/informational cards.
 *
 * @example
 * ```tsx
 * import { ThemedCard } from '@/components/ui/ThemedCard';
 *
 * // Interactive card with click handler
 * <ThemedCard onClick={() => navigate('/loans/123')} data-testid="loan-card">
 *   <h3>Loan #123</h3>
 *   <p>N$ 15,000.00</p>
 * </ThemedCard>
 *
 * // Static display card (no hover lift)
 * <ThemedCard hoverEffect={false} className="p-8">
 *   <StatDisplay value={42} label="Active Loans" />
 * </ThemedCard>
 * ```
 */

import { cn } from '@/lib/utils';
import React from 'react';

/**
 * Props for {@link ThemedCard}.
 *
 * @prop children - Card content.
 * @prop hoverEffect - Enable hover animation (lift/glow/offset). Defaults to `true`.
 * @prop onClick - Optional click handler; sets `cursor-pointer` automatically when `hoverEffect` is enabled.
 * @prop data-testid - Forwarded to the root `div` for Playwright/testing-library selectors.
 */
interface ThemedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = true,
  style,
  'data-testid': dataTestId,
}) => {
  return (
    <div
      onClick={onClick}
      style={style}
      data-testid={dataTestId}
      className={cn(
        'relative p-6 transition-all duration-500 ease-out',
        'touch-no-hover',
        'rounded-2xl border border-[#DCE8D8] bg-white shadow-[0_12px_32px_rgba(39,79,53,0.06)]',
        'font-sans text-[#274F35]',
        'rounded-2xl',
        hoverEffect && 'cursor-pointer hover:-translate-y-1 hover:shadow-lg',
        className
      )}
    >
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
};

export default ThemedCard;
