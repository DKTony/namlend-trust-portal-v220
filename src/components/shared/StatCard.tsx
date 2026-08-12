import { ThemedCard } from '@/components/ui/ThemedCard';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color?: 'black' | 'green' | 'blue' | 'amber' | 'red';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'black',
  className,
}) => {
  const colorStyles = {
    black: 'bg-muted text-foreground',
    green: 'bg-green-50  text-green-700 ',
    blue: 'bg-blue-50  text-blue-700 ',
    amber: 'bg-amber-50  text-amber-700 ',
    red: 'bg-red-50  text-red-700 ',
  };

  const iconColorStyles = {
    black: 'text-foreground',
    green: 'text-green-600 ',
    blue: 'text-blue-600 ',
    amber: 'text-amber-600 ',
    red: 'text-red-600 ',
  };

  return (
    <ThemedCard className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
          <h3
            className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate tabular-nums"
            title={String(value)}
          >
            {value}
          </h3>
          {subValue && (
            <p className={cn('text-xs font-medium mt-1', iconColorStyles[color])}>{subValue}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', colorStyles[color])}>
          <Icon size={24} className={iconColorStyles[color]} />
        </div>
      </div>
    </ThemedCard>
  );
};

export default StatCard;
