import React from 'react';
import { View, ViewProps, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme';

interface NeoCardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'glass' | 'ai';
  className?: string;
  intensity?: number;
}

export const NeoCard: React.FC<NeoCardProps> = ({ 
  children, 
  variant = 'default', 
  className = '',
  intensity = 50,
  ...props 
}) => {
  const { mode } = useTheme();
  const baseStyle = "rounded-3xl p-4 overflow-hidden";
  
  const variants = {
    default: "bg-zinc-900 border border-zinc-800",
    elevated: "bg-zinc-800 border border-zinc-700 shadow-lg",
    glass: "border border-white/10", // Background handled by BlurView
    ai: "bg-indigo-900/20 border border-indigo-500/20",
  };

  const lightVariants = {
    default: "bg-white border border-zinc-200",
    elevated: "bg-white border border-zinc-100 shadow-lg",
    glass: "border border-black/5",
    ai: "bg-indigo-50 border border-indigo-200",
  };

  const currentVariants = mode === 'dark' ? variants : lightVariants;

  if (variant === 'glass') {
    return (
      <View className={`${baseStyle} ${currentVariants.glass} ${className}`} {...props}>
        {Platform.OS === 'ios' ? (
          <BlurView 
            intensity={intensity} 
            tint={mode === 'dark' ? "dark" : "light"} 
            style={StyleSheet.absoluteFill} 
          />
        ) : (
          <View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: mode === 'dark' ? 'rgba(24, 24, 27, 0.8)' : 'rgba(255, 255, 255, 0.8)' }
            ]} 
          />
        )}
        <View style={{ zIndex: 1 }}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View 
      className={`${baseStyle} ${currentVariants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </View>
  );
};

