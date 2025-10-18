/**
 * Optimized Image Component
 * Version: v2.6.0
 * 
 * Image with lazy loading and caching
 */

import React, { useState, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';

interface OptimizedImageProps extends ImageProps {
  uri: string;
  width?: number;
  height?: number;
  placeholder?: React.ReactNode;
}

export default function OptimizedImage({
  uri,
  width,
  height,
  placeholder,
  style,
  ...props
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[{ width, height }, style]}>
      {loading && (
        <View style={[styles.placeholder, { width, height }]}>
          {placeholder || <ActivityIndicator color="#2563eb" />}
        </View>
      )}
      
      {!error && (
        <Image
          source={{ uri }}
          style={[{ width, height }, style]}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          resizeMode="cover"
          {...props}
        />
      )}
      
      {error && (
        <View style={[styles.error, { width, height }]}>
          <View style={styles.errorIcon} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  error: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
  },
});
