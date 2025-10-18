/**
 * ThemeProvider - NamLend Mobile v2.7.0
 * Manages theme state (dark/light mode) and provides theme context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens, ThemeMode, ThemeColors } from './tokens';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  tokens: typeof tokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@namlend_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultMode = 'light' 
}) => {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode === 'light' || savedMode === 'dark') {
        setMode(savedMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    saveThemePreference(newMode);
  };

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setTheme(newMode);
  };

  const lightColors: ThemeColors = {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceAlt: '#F1F3F5',
    primary: '#2563EB',
    primaryLight: '#3B82F6',
    primaryDark: '#1D4ED8',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    divider: '#E5E7EB',
    overlay: 'rgba(0, 0, 0, 0.5)',
  };

  const colors = mode === 'light' ? lightColors : tokens.colors[mode];

  const value: ThemeContextValue = {
    mode,
    colors,
    toggleTheme,
    setTheme,
    tokens,
  };

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
