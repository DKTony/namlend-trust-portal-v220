import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const HeroCard: React.FC = () => {
  const { theme } = useTheme();

  // Determine card gradient based on theme
  const cardGradient = theme === 'lux' 
    ? 'bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-black border-amber-500/30' 
    : theme === 'neo' 
    ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700'
    : 'bg-gradient-to-br from-white/20 via-white/10 to-transparent border-white/20'; // Glass default

  return (
    <div className={`
      relative w-[340px] h-[220px] rounded-3xl p-6 
      border backdrop-blur-md shadow-2xl
      flex flex-col justify-between
      overflow-hidden
      transform rotate-[-15deg] hover:rotate-[-12deg] transition-transform duration-1000 ease-in-out
      ${cardGradient}
    `}>
      {/* Background Shine Effect */}
      <div className="hero__card-shine absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

      {/* Top Section */}
      <div className="hero__card-top flex justify-between items-start z-10">
        <img 
          src="https://cdn.prod.website-files.com/5ffcd643561bc26ed27a87a1/5ffd18789f2a80a641edb43b_white-logo.svg" 
          loading="lazy" 
          alt="Card Logo" 
          className="w-12 opacity-90"
        />
        <img 
          src="https://cdn.prod.website-files.com/5ffcd643561bc26ed27a87a1/5ffd1878846c12271da4ef13_white-icon.svg" 
          loading="lazy" 
          alt="Card Icon" 
          className="w-8 opacity-80"
        />
      </div>

      {/* Bottom Section */}
      <div className="hero__card-bottom z-10 space-y-4">
        <p className="hero__card-text text-white/90 font-mono text-lg tracking-widest drop-shadow-md font-semibold">
          4323 7645 2828 0713
        </p>
        <div className="flex justify-between items-end">
            <div className="text-white/60 text-xs">
                <p>VALID THRU</p>
                <p>12/28</p>
            </div>
            <img 
            src="https://cdn.prod.website-files.com/5ffcd643561bc26ed27a87a1/5ffd187853b7aaf987f0090d_white-bar.svg" 
            loading="lazy" 
            alt="Mastercard" 
            className="h-8 opacity-90"
            />
        </div>
      </div>
      
      {/* Decorative circles */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
    </div>
  );
};