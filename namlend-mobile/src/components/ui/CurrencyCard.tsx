/**
 * CurrencyCard - NamLend Mobile v2.7.0
 * Horizontal info card for currency/rate display
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

interface CurrencyCardProps {
  icon?: LucideIcon;
  label: string;
  primaryValue: string;
  secondaryValue?: string;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const CurrencyCard: React.FC<CurrencyCardProps> = ({
  icon,
  label,
  primaryValue,
  secondaryValue,
  onPress,
  style,
  testID,
}) => {
  const { colors, tokens } = useTheme();

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={handlePress}
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.base,
          ...tokens.shadows.card,
        },
        style,
      ]}
    >
      {icon && (
        <View style={styles.iconContainer}>
          {React.createElement(icon, { size: 24, color: colors.textSecondary })}
        </View>
      )}

      <View style={styles.content}>
        <Text
          style={[
            styles.label,
            {
              color: colors.textSecondary,
              fontSize: tokens.typography.caption.fontSize,
              lineHeight: tokens.typography.caption.lineHeight,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.primaryValue,
            {
              color: colors.textPrimary,
              fontSize: tokens.typography.bodyMedium.fontSize,
              fontWeight: tokens.typography.bodyMedium.fontWeight,
              lineHeight: tokens.typography.bodyMedium.lineHeight,
            },
          ]}
          numberOfLines={1}
        >
          {primaryValue}
        </Text>

        {secondaryValue && (
          <Text
            style={[
              styles.secondaryValue,
              {
                color: colors.textTertiary,
                fontSize: tokens.typography.caption.fontSize,
                lineHeight: tokens.typography.caption.lineHeight,
              },
            ]}
            numberOfLines={1}
          >
            {secondaryValue}
          </Text>
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 80,
    minWidth: 150,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  label: {
    marginBottom: 4,
  },
  primaryValue: {
    marginBottom: 2,
  },
  secondaryValue: {
    marginTop: 2,
  },
});
