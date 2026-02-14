import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface CreditScoreGaugeProps {
  score: number;
}

export const CreditScoreGauge: React.FC<CreditScoreGaugeProps> = ({ score }) => {
  const { styles, theme } = useTheme();
  
  // Credit Score Range: 300 - 850
  const percentage = Math.min(Math.max((score - 300) / (850 - 300), 0), 1);
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - percentage * circumference;

  const getScoreColor = () => {
    if (score >= 750) return '#10b981'; // Emerald
    if (score >= 670) return '#3b82f6'; // Blue
    if (score >= 580) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getRiskLevel = () => {
    if (score >= 750) return 'Excellent';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* SVG Gauge */}
      <div className="relative w-48 h-48">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 overflow-visible"
        >
          {/* Background Circle */}
          <circle
            stroke={theme === 'glass' ? 'rgba(255,255,255,0.1)' : theme === 'neo' ? 'rgba(0,0,0,0.1)' : 'rgba(212, 175, 55, 0.1)'}
            strokeWidth={strokeWidth}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress Circle */}
          <circle
            stroke={getScoreColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s ease-in-out' }}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="drop-shadow-[0_0_10px_rgba(0,0,0,0.3)]"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-4xl font-bold tracking-tighter ${styles.textClass}`}>
            {score}
          </span>
          <span className={`text-xs font-semibold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full ${styles.variant === 'glass' ? 'bg-white/10' : ''}`} style={{ color: getScoreColor() }}>
            {getRiskLevel()}
          </span>
        </div>
      </div>

      {/* Info Stats */}
      <div className="w-full mt-4 space-y-3">
        <div className="flex justify-between items-center text-sm">
           <span className={`opacity-60 flex items-center gap-1 ${styles.textClass}`}>
             <HelpCircle size={12} /> Factors
           </span>
           <span className={`font-medium text-emerald-500 flex items-center gap-1`}>
             <TrendingUp size={14} /> +15pts
           </span>
        </div>
        
        {/* Mock History Bar */}
        <div className="flex gap-1 h-8 items-end justify-between px-2 opacity-50">
           {[40, 50, 45, 60, 55, 70, 80].map((h, i) => (
              <div 
                key={i} 
                className={`w-1.5 rounded-t-sm transition-all duration-500 hover:opacity-100 ${styles.variant === 'lux' ? 'bg-amber-500' : 'bg-current'}`} 
                style={{ height: `${h}%` }} 
              />
           ))}
        </div>
        
        <p className={`text-xs text-center opacity-40 mt-2 ${styles.textClass}`}>
           Updated: Dec 31, 2025
        </p>
      </div>
    </div>
  );
};