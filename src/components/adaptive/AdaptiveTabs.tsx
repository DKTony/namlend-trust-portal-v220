import React from 'react';
import { LucideIcon } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';

export interface AdaptiveTabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  shortLabel?: string;
}

interface AdaptiveTabsProps {
  items: AdaptiveTabItem[];
  className?: string;
  triggerClassName?: string;
  desktopColumns?: number;
  compactIconOnly?: boolean;
}

export const AdaptiveTabs: React.FC<AdaptiveTabsProps> = ({
  items,
  className,
  triggerClassName,
  desktopColumns,
  compactIconOnly = false,
}) => {
  const layout = useAdaptiveLayout();
  const compact = layout.isCompact;
  const columns = desktopColumns ?? items.length;

  return (
    <div className={cn('w-full min-w-0', compact && '-mx-1 overflow-x-auto px-1 scrollbar-none')}>
      <TabsList
        className={cn(
          'min-h-11 h-auto p-1',
          compact ? 'inline-flex w-max min-w-full justify-start gap-1' : 'grid w-full gap-1',
          className
        )}
        style={compact ? undefined : { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const label = compact ? item.shortLabel || item.label : item.label;

          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              aria-label={item.label}
              title={item.label}
              className={cn(
                'min-h-10 gap-2 rounded-md px-3 text-xs sm:text-sm',
                compact && 'shrink-0',
                triggerClassName
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {(!compactIconOnly || !compact) && <span className="truncate">{label}</span>}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
};

export default AdaptiveTabs;
