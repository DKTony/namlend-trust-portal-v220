/**
 * Network Status Banner
 * Version: v2.6.0
 * 
 * Displays network connectivity status and offline queue count
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Network from 'expo-network';
import { WifiOff, Wifi } from 'lucide-react-native';

export default function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [slideAnim] = useState(new Animated.Value(-60));

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
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline]);

  const checkNetworkStatus = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsOnline(networkState.isConnected === true && networkState.isInternetReachable === true);
    } catch (error) {
      console.error('Network check error:', error);
    }
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <WifiOff color="#ffffff" size={20} />
        <Text style={styles.text}>No internet connection</Text>
      </View>
      <Text style={styles.subtext}>Changes will sync when online</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  subtext: {
    fontSize: 12,
    color: '#fee2e2',
    marginLeft: 28,
  },
});
