/**
 * BalanceCard - NamLend Mobile v2.7.0
 * Elevated card for displaying balance information
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface BalanceCardProps {
  amount: number;
  label: string;
  currency?: string;
  subtitle?: string;
  style?: ViewStyle;
  testID?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  amount,
  label,
  currency = 'N$',
  subtitle,
  style,
  testID,
}) => {
  const { colors, tokens } = useTheme();

  const formatAmount = (value: number): string => {
    return value.toLocaleString('en-NA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          ...tokens.shadows.card,
        },
        style,
      ]}
    >
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
          styles.amount,
          {
            color: colors.textPrimary,
            fontSize: tokens.typography.display.fontSize,
            lineHeight: tokens.typography.display.lineHeight,
            fontWeight: tokens.typography.display.fontWeight,
          },
        ]}
      >
        {currency} {formatAmount(amount)}
      </Text>

      {subtitle && (
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textTertiary,
              fontSize: tokens.typography.caption.fontSize,
              lineHeight: tokens.typography.caption.lineHeight,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 100,
  },
  label: {
    marginBottom: 4,
  },
  amount: {
    marginBottom: 4,
  },
  subtitle: {
    marginTop: 4,
  },
});
