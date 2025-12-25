/**
 * NamLend Mobile App Entry Point
 * Version: v2.7.1 (Neo-Fintech Design Complete)
 */

import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import SanityScreen from './src/screens/SanityScreen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

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
  let [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultMode="dark">
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
    backgroundColor: '#09090b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
});

const AppInitializer: React.FC = () => {
  const SHOW_SANITY = false;
  const OFFLINE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE === 'true';
  const { mode, colors } = useTheme();

  useEffect(() => {
    if (!SHOW_SANITY && OFFLINE_ENABLED) {
      (async () => {
        const mod = await import('./src/utils/offlineProcessor');
        mod.startOfflineProcessor();
      })();
    }
  }, []);

  const navigationTheme = React.useMemo(() => ({
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.divider,
      primary: colors.primary,
    },
  }), [mode, colors]);

  const linking = React.useMemo(() => ({
    prefixes: [],
    config: {
      screens: {
        Auth: 'auth',
        Client: 'client',
        Approver: 'approver',
      },
    },
  }), []);

  if (SHOW_SANITY) {
    return (
      <>
        <SanityScreen />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <NavigationContainer
        theme={navigationTheme}
        linking={linking}
        documentTitle={{
          formatter: (options, route) =>
            `NamLend Mobile - ${options?.title ?? route?.name ?? 'Loading'}`,
        }}
      >
        <AppNavigator />
      </NavigationContainer>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
