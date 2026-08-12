import { cn } from '@/lib/utils';
import React from 'react';

interface LandingCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

const LandingCard: React.FC<LandingCardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  onClick,
}) => {
  const hoverClass = hoverEffect
    ? 'cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'
    : '';

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'rounded-2xl border border-[#DCE8D8] bg-white shadow-[0_12px_32px_rgba(39,79,53,0.06)]',
        'font-sans text-[#274F35]',
        hoverClass,
        className
      )}
      onClick={onClick}
    >
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export default LandingCard;
