/**
 * NamLend Mobile App Entry Point
 * Version: v2.7.0 (UI Enhancement - Phase 1)
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/theme';
import SanityScreen from './src/screens/SanityScreen';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultMode="light">
          <PaperProvider>
            <AppInitializer />
          </PaperProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const AppInitializer: React.FC = () => {
  const SHOW_SANITY = false;
  const [Navigator, setNavigator] = useState<React.ComponentType | null>(null);
  const OFFLINE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE === 'true';
  useEffect(() => {
    if (!SHOW_SANITY) {
      (async () => {
        if (OFFLINE_ENABLED) {
          const mod = await import('./src/utils/offlineProcessor');
          mod.startOfflineProcessor();
        }
        const nav = await import('./src/navigation/AppNavigator');
        setNavigator(() => nav.default);
      })();
    }
  }, []);
  if (SHOW_SANITY) {
    return (
      <>
        <SanityScreen />
        <StatusBar style="auto" />
      </>
    );
  }
  return Navigator ? (
    <>
      <Navigator />
      <StatusBar style="auto" />
    </>
  ) : null;
}
