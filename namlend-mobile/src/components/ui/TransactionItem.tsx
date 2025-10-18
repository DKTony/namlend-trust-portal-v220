/**
 * TransactionItem - NamLend Mobile v2.7.0
 * List item for transactions with icon, text, and amount
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

interface TransactionItemProps {
  title: string;
  subtitle?: string;
  amount: number;
  type: 'income' | 'expense';
  icon?: LucideIcon;
  currency?: string;
  onPress?: () => void;
  testID?: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  title,
  subtitle,
  amount,
  type,
  icon,
  currency = 'N$',
  onPress,
  testID,
}) => {
  const { colors, tokens } = useTheme();

  const IconComponent = icon || (type === 'income' ? ArrowUpRight : ArrowDownLeft);

  const getIconColor = () => {
    return type === 'income' ? colors.success : colors.error;
  };

  const getAmountColor = () => {
    return type === 'income' ? colors.success : colors.error;
  };

  const formatAmount = (value: number): string => {
    const formatted = Math.abs(value).toLocaleString('en-NA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

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
        styles.container,
        {
          paddingVertical: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.base,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${getIconColor()}1A`, // 10% opacity
            borderRadius: tokens.radius.round,
          },
        ]}
      >
        <IconComponent size={20} color={getIconColor()} />
      </View>

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              fontSize: tokens.typography.body.fontSize,
              lineHeight: tokens.typography.body.lineHeight,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontSize: tokens.typography.caption.fontSize,
                lineHeight: tokens.typography.caption.lineHeight,
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.amount,
          {
            color: getAmountColor(),
            fontSize: tokens.typography.bodyMedium.fontSize,
            fontWeight: tokens.typography.bodyMedium.fontWeight,
          },
        ]}
      >
        {currency} {formatAmount(amount)}
      </Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  amount: {
    marginLeft: 12,
  },
});
