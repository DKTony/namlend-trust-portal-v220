import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';
import React from 'react';

interface AdaptiveCollectionProps<T> {
  items: T[];
  getKey: (item: T, index: number) => React.Key;
  renderCard: (item: T, index: number) => React.ReactNode;
  renderWide?: (items: T[]) => React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
}

export function AdaptiveCollection<T>({
  items,
  getKey,
  renderCard,
  renderWide,
  empty,
  className,
}: AdaptiveCollectionProps<T>) {
  const { isCompact } = useAdaptiveLayout();

  if (!items.length) return <>{empty}</>;

  if (!isCompact && renderWide) {
    return <>{renderWide(items)}</>;
  }

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:gap-4', className)}>
      {items.map((item, index) => (
        <React.Fragment key={getKey(item, index)}>{renderCard(item, index)}</React.Fragment>
      ))}
    </div>
  );
}

export default AdaptiveCollection;
