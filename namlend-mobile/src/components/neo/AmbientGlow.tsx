import React from 'react';
import { View, Dimensions } from 'react-native';

interface AmbientGlowProps {
  className?: string;
  position?: 'top' | 'bottom';
}

export const AmbientGlow: React.FC<AmbientGlowProps> = ({ 
  className = '',
  position = 'top' 
}) => {
  const { width } = Dimensions.get('window');
  
  // Simulation of a glow using a large colored view with low opacity
  // In a real production app with expo-linear-gradient or standard svg, 
  // we would make this a true radial gradient.
  
  return (
    <View 
      className={`absolute w-full items-center justify-center z-0 pointer-events-none ${className}`}
      style={{
        [position]: -100, // Position it slightly off screen
        left: 0,
        right: 0,
      }}
    >
      <View 
        style={{
          width: width * 1.5,
          height: width * 1.5,
          backgroundColor: '#2563eb', // blue-600
          opacity: 0.08,
          borderRadius: 9999,
          transform: [{ scaleX: 1.5 }], // Make it wider
        }}
      />
    </View>
  );
};
