/**
 * NumericKeypad - NamLend Mobile v2.7.0
 * 3x4 numeric input grid with haptic feedback
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

interface NumericKeypadProps {
  onNumberPress: (number: string) => void;
  onDeletePress: () => void;
  onConfirmPress?: () => void;
  showDecimal?: boolean;
  confirmLabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onNumberPress,
  onDeletePress,
  onConfirmPress,
  showDecimal = true,
  confirmLabel = 'Done',
  style,
  testID,
}) => {
  const { colors, tokens } = useTheme();

  const handlePress = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNumberPress(value);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDeletePress();
  };

  const handleConfirm = () => {
    if (onConfirmPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onConfirmPress();
    }
  };

  const renderButton = (value: string, isSpecial = false) => (
    <TouchableOpacity
      key={value}
      onPress={() => handlePress(value)}
      style={[
        styles.button,
        {
          backgroundColor: isSpecial ? colors.surface : 'transparent',
          borderRadius: tokens.radius.md,
        },
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: colors.textPrimary,
            fontSize: 24,
            fontWeight: tokens.typography.bodyMedium.fontWeight,
          },
        ]}
      >
        {value}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View testID={testID} style={[styles.container, style]}>
      {/* Row 1: 1, 2, 3 */}
      <View style={styles.row}>
        {renderButton('1')}
        {renderButton('2')}
        {renderButton('3')}
      </View>

      {/* Row 2: 4, 5, 6 */}
      <View style={styles.row}>
        {renderButton('4')}
        {renderButton('5')}
        {renderButton('6')}
      </View>

      {/* Row 3: 7, 8, 9 */}
      <View style={styles.row}>
        {renderButton('7')}
        {renderButton('8')}
        {renderButton('9')}
      </View>

      {/* Row 4: Decimal/Empty, 0, Delete */}
      <View style={styles.row}>
        {showDecimal ? (
          renderButton('.', true)
        ) : (
          <View style={styles.button} />
        )}
        {renderButton('0')}
        <TouchableOpacity
          onPress={handleDelete}
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderRadius: tokens.radius.md,
            },
          ]}
          activeOpacity={0.7}
        >
          <Delete size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Optional Confirm Button */}
      {onConfirmPress && (
        <TouchableOpacity
          onPress={handleConfirm}
          style={[
            styles.confirmButton,
            {
              backgroundColor: colors.primary,
              borderRadius: tokens.radius.pill,
              marginTop: tokens.spacing.base,
            },
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.confirmText,
              {
                color: '#FFFFFF',
                fontSize: tokens.typography.button.fontSize,
                fontWeight: tokens.typography.button.fontWeight,
              },
            ]}
          >
            {confirmLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  buttonText: {
    textAlign: 'center',
  },
  confirmButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  confirmText: {
    textAlign: 'center',
  },
});
