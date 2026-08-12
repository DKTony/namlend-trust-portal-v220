import { cn } from '@/lib/utils';
import React from 'react';

interface LandingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  fullWidth?: boolean;
}

const LandingButton: React.FC<LandingButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  fullWidth = false,
  ...props
}) => {
  let variantClass = '';
  if (variant === 'primary') {
    variantClass =
      'rounded-xl bg-[#3F713E] text-white shadow-sm transition-colors hover:bg-[#274F35]';
  } else if (variant === 'secondary') {
    variantClass =
      'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] transition-colors hover:bg-[#EEF5EB]';
  } else {
    variantClass = 'bg-transparent font-sans text-[#274F35] hover:bg-[#EEF5EB]';
  }

  return (
    <button
      className={cn(
        'relative px-6 py-3 font-semibold flex items-center justify-center gap-2',
        fullWidth && 'w-full',
        variantClass,
        'rounded-xl transition-transform duration-200 active:scale-[0.98]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default LandingButton;
