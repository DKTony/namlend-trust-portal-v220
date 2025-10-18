/**
 * Session Lock Hook
 * Version: v2.6.0
 * 
 * Handles idle session timeout and biometric re-authentication
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_TIMEOUT_KEY = '@session_timeout';
const SESSION_TIMEOUT_MS = parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES || '15', 10) * 60 * 1000;

export function useSessionLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkBiometricAvailability();
    setupActivityTracking();
    setupAppStateListener();

    return () => {
      // Cleanup handled by individual effects
    };
  }, []);

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);
  };

  const setupActivityTracking = () => {
    // Reset activity timer on user interaction
    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      setIsLocked(false);
    };

    // Check for idle timeout every minute
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
        lockSession();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  };

  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      const lastActivity = await AsyncStorage.getItem(SESSION_TIMEOUT_KEY);
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
        if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
          lockSession();
        }
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background
      await AsyncStorage.setItem(SESSION_TIMEOUT_KEY, Date.now().toString());
    }

    appState.current = nextAppState;
  };

  const lockSession = () => {
    setIsLocked(true);
  };

  const unlockSession = async (): Promise<boolean> => {
    if (!biometricAvailable) {
      // No biometric available, unlock immediately
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      return true;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock NamLend',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        lastActivityRef.current = Date.now();
        await AsyncStorage.setItem(SESSION_TIMEOUT_KEY, Date.now().toString());
        return true;
      }

      return false;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const resetActivity = () => {
    lastActivityRef.current = Date.now();
  };

  return {
    isLocked,
    biometricAvailable,
    unlockSession,
    resetActivity,
    lockSession,
  };
}
