import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  className 
}) => {
  const colorStyles = {
    black: "bg-muted text-foreground",
    green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  };

  const iconColorStyles = {
    black: "text-foreground",
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className={cn("border-border shadow-sm hover:shadow-md transition-shadow duration-200 bg-card", className)}>
      <CardContent className="p-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
          <h3 
            className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate tabular-nums" 
            title={String(value)}
          >
            {value}
          </h3>
          {subValue && (
            <p className={cn("text-xs font-medium mt-1", iconColorStyles[color])}>
              {subValue}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colorStyles[color])}>
          <Icon size={24} className={iconColorStyles[color]} />
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
