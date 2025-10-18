/**
 * Optimized List Component
 * Version: v2.6.0
 * 
 * FlatList with performance optimizations
 */

import React, { memo } from 'react';
import { FlatList, FlatListProps } from 'react-native';

interface OptimizedListProps<T> extends FlatListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement | null;
  keyExtractor: (item: T, index: number) => string;
}

function OptimizedListComponent<T>({
  data,
  renderItem,
  keyExtractor,
  ...props
}: OptimizedListProps<T>) {
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      getItemLayout={
        props.getItemLayout ||
        ((data, index) => ({
          length: 100, // Estimated item height
          offset: 100 * index,
          index,
        }))
      }
      {...props}
    />
  );
}

export const OptimizedList = memo(OptimizedListComponent) as typeof OptimizedListComponent;
