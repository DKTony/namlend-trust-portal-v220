import { useTheme } from '@/context/ThemeContext';
import React from 'react';

interface SectionDividerProps {
  position: 'top' | 'bottom';
}

const SectionDivider: React.FC<SectionDividerProps> = ({ position }) => {
  const { theme, isDark } = useTheme();

  if (theme === 'neo') {
    return (
      <div
        className={`w-full h-8 overflow-hidden ${position === 'top' ? '-mb-1' : '-mt-1'} z-20 relative`}
      >
        <svg
          className={`w-full h-full ${isDark ? 'text-zinc-900' : 'text-white'}`}
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
          fill="currentColor"
        >
          <path d="M0,120 L1200,120 L1200,0 L0,0 L0,120 Z M0,60 L50,110 L100,60 L150,110 L200,60 L250,110 L300,60 L350,110 L400,60 L450,110 L500,60 L550,110 L600,60 L650,110 L700,60 L750,110 L800,60 L850,110 L900,60 L950,110 L1000,60 L1050,110 L1100,60 L1150,110 L1200,60 V0 H0 V60 Z" />
        </svg>
      </div>
    );
  }

  if (theme === 'glass') {
    return (
      <div
        className={`w-full h-24 overflow-hidden ${position === 'top' ? '-mb-12' : '-mt-12'} z-20 relative opacity-30`}
      >
        <svg
          viewBox="0 0 1440 320"
          className="w-full h-full text-white"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160V320H1392C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320H0Z" />
        </svg>
      </div>
    );
  }

  if (theme === 'lux') {
    return (
      <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent my-12" />
    );
  }

  return null;
};

export default SectionDivider;
