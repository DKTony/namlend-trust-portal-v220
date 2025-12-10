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
    black: "bg-zinc-100 text-zinc-900",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  const iconColorStyles = {
    black: "text-zinc-900",
    green: "text-green-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };

  return (
    <Card className={cn("border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      <CardContent className="p-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</h3>
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
