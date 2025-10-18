/**
 * Design Tokens - NamLend Mobile v2.7.0
 * Perpetio-inspired design system
 * 
 * Usage:
 *   import { tokens } from '@/theme/tokens';
 *   backgroundColor: tokens.colors.dark.background
 */

export const tokens = {
  colors: {
    dark: {
      // Backgrounds
      background: '#1C1C1E',
      surface: '#2C2C2E',
      surfaceAlt: '#3A3A3C',
      
      // Text
      textPrimary: '#FFFFFF',
      textSecondary: '#AEAEB2',
      textTertiary: '#8E8E93',
      
      // Semantic
      success: '#34C759',
      error: '#FF3B30',
      warning: '#FF9500',
      primary: '#007AFF',
      
      // UI Elements
      divider: '#38383A',
      overlay: 'rgba(0, 0, 0, 0.4)',
    },
    light: {
      // Backgrounds
      background: '#FFFFFF',
      surface: '#F8F9FA',
      surfaceAlt: '#F1F3F5',
      
      // Text
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      
      // Semantic
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      primary: '#2563EB',
      
      // UI Elements
      divider: '#E5E7EB',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
  },
  
  typography: {
    display: {
      fontFamily: 'Inter-Bold',
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '700' as const,
    },
    h1: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
    },
    h2: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as const,
    },
    body: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    bodyMedium: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500' as const,
    },
    caption: {
      fontFamily: 'Inter-Regular',
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400' as const,
    },
    button: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '600' as const,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
  },
  
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    pill: 28,
    round: 9999,
  },
  
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    sheet: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 16,
    },
    button: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  
  animation: {
    duration: {
      fast: 100,
      normal: 300,
      slow: 500,
    },
    easing: {
      default: 'ease-in-out',
      spring: 'spring',
    },
  },
  
  layout: {
    screenPadding: 16,
    cardSpacing: 16,
    sectionSpacing: 24,
    minTapTarget: 44,
  },
} as const;

export type Theme = typeof tokens;
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  success: string;
  error: string;
  warning: string;
  primary: string;
  primaryLight?: string;
  primaryDark?: string;
  divider: string;
  overlay: string;
};
export type ThemeMode = 'light' | 'dark';
