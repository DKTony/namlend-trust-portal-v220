/**
 * ThemeToggle Component
 * Version: v2.7.0
 * Toggle between light and dark mode
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface ThemeToggleProps {
  style?: object;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ style }) => {
  const { mode, toggleTheme, colors, tokens } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: tokens.radius.round,
          padding: tokens.spacing.sm,
        },
        style,
      ]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {mode === 'light' ? (
          <>
            <Sun size={20} color={colors.warning} />
            <Text
              style={[
                styles.label,
                {
                  color: colors.textPrimary,
                  fontSize: tokens.typography.body.fontSize,
                  marginLeft: tokens.spacing.sm,
                },
              ]}
            >
              Light Mode
            </Text>
          </>
        ) : (
          <>
            <Moon size={20} color={colors.primary} />
            <Text
              style={[
                styles.label,
                {
                  color: colors.textPrimary,
                  fontSize: tokens.typography.body.fontSize,
                  marginLeft: tokens.spacing.sm,
                },
              ]}
            >
              Dark Mode
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: '500',
  },
});
