/**
 * Hero Card Component
 * Decorative credit card visual for dashboard backgrounds
 */

import { cn } from '@/lib/utils';
import React from 'react';

interface HeroCardProps {
  className?: string;
}

export const HeroCard: React.FC<HeroCardProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'relative w-[340px] h-[220px] rounded-3xl p-6',
        'border backdrop-blur-md shadow-2xl',
        'flex flex-col justify-between overflow-hidden',
        'transform rotate-[-15deg] hover:rotate-[-12deg] transition-transform duration-1000 ease-in-out',
        'border-[#7CA05C]/50 bg-gradient-to-br from-[#274F35] via-[#3F713E] to-[#7CA05C]',
        className
      )}
      data-testid="hero-card"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

      <div className="flex justify-between items-start z-10">
        <div className="w-12 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded opacity-90" />
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-red-500/80" />
          <div className="w-6 h-6 rounded-full bg-amber-500/80 -ml-2" />
        </div>
      </div>

      <div className="z-10 space-y-4">
        <p className="text-white/90 font-mono text-lg tracking-widest drop-shadow-md font-semibold">
          4323 7645 2828 0713
        </p>
        <div className="flex justify-between items-end">
          <div className="text-white/60 text-xs">
            <p>VALID THRU</p>
            <p>12/28</p>
          </div>
          <div className="text-white/80 text-xs text-right">
            <p>OG Financial Services</p>
            <p className="font-semibold">PLATINUM</p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
    </div>
  );
};

export default HeroCard;
