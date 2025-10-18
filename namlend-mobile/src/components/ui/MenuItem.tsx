/**
 * MenuItem - NamLend Mobile v2.7.0
 * List item with icon, label, and chevron for menu navigation
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LucideIcon, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  badge?: string | number;
  showChevron?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  subtitle,
  badge,
  showChevron = true,
  onPress,
  style,
  testID,
}) => {
  const { colors, tokens } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      testID={testID}
      style={[
        styles.container,
        {
          paddingVertical: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: colors.background,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${colors.primary}1A`, // 10% opacity
            borderRadius: tokens.radius.sm,
          },
        ]}
      >
        {React.createElement(icon, { size: 20, color: colors.primary })}
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.label,
            {
              color: colors.textPrimary,
              fontSize: tokens.typography.body.fontSize,
              lineHeight: tokens.typography.body.lineHeight,
            },
          ]}
        >
          {label}
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
          >
            {subtitle}
          </Text>
        )}
      </View>

      {badge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.error,
              borderRadius: tokens.radius.round,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: tokens.typography.bodyMedium.fontWeight,
              },
            ]}
          >
            {badge}
          </Text>
        </View>
      )}

      {showChevron && (
        <ChevronRight size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  badgeText: {
    textAlign: 'center',
  },
});
