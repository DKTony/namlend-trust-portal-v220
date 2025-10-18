/**
 * PrimaryButton - NamLend Mobile v2.7.0
 * Pill-shaped CTA button with haptic feedback
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'large',
  style,
  textStyle,
  testID,
}) => {
  const { colors, tokens } = useTheme();

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceAlt;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.surface;
      case 'danger':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;
    if (variant === 'secondary') return colors.textPrimary;
    return '#FFFFFF';
  };

  const getHeight = () => {
    switch (size) {
      case 'small':
        return 40;
      case 'medium':
        return 48;
      case 'large':
        return 56;
      default:
        return 56;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          height: getHeight(),
          borderRadius: tokens.radius.pill,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize: tokens.typography.button.fontSize,
              fontWeight: tokens.typography.button.fontWeight,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
