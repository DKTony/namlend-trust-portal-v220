import React from 'react';
import { View, Text, Platform } from 'react-native';
import { AmbientGlow } from '../components/neo/AmbientGlow';

const SanityScreen: React.FC = () => {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
      <AmbientGlow position="top" />
      <Text className="text-white text-3xl font-sans-bold mb-2 tracking-tight">NamLend Mobile</Text>
      <Text className="text-zinc-400 text-base font-sans mb-3 opacity-90">Sanity Check: Expo is running</Text>
      <Text className="text-zinc-600 text-sm font-sans-medium">Platform: {Platform.OS}</Text>
    </View>
  );
};

export default SanityScreen;
