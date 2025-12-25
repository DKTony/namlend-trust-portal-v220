/**
 * Network Status Banner
 * Version: v2.6.0
 * 
 * Displays network connectivity status and offline queue count
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import * as Network from 'expo-network';
import { WifiOff } from 'lucide-react-native';

export default function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOnline) {
      // Slide down
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline]);

  const checkNetworkStatus = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsOnline(networkState.isConnected === true && networkState.isInternetReachable !== false);
    } catch (error) {
      console.error('Network check error:', error);
    }
  };

  return (
    <Animated.View
      className="absolute top-0 left-0 right-0 bg-red-600 z-50 shadow-lg shadow-black/20"
      style={{
        transform: [{ translateY: slideAnim }],
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 16,
        paddingHorizontal: 20,
      }}
    >
      <View className="flex-row items-center justify-center gap-2 mb-1">
        <WifiOff color="#ffffff" size={18} />
        <Text className="text-white font-sans-bold text-sm tracking-wide">
          No Internet Connection
        </Text>
      </View>
      <Text className="text-red-100 text-xs font-sans text-center">
        Changes will be saved and synced when you're back online
      </Text>
    </Animated.View>
  );
}
