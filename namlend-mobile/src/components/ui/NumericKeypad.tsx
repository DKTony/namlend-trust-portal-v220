/**
 * NumericKeypad - NamLend Mobile v2.7.0
 * 3x4 numeric input grid with haptic feedback
 */

import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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

  const renderButton = (value: string) => (
    <TouchableOpacity
      key={value}
      onPress={() => handlePress(value)}
      className="flex-1 h-16 justify-center items-center mx-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm"
      activeOpacity={0.7}
    >
      <Text className="text-white text-2xl font-sans-bold tracking-tight">
        {value}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View testID={testID} style={style} className="w-full">
      {/* Row 1: 1, 2, 3 */}
      <View className="flex-row justify-between mb-3">
        {renderButton('1')}
        {renderButton('2')}
        {renderButton('3')}
      </View>

      {/* Row 2: 4, 5, 6 */}
      <View className="flex-row justify-between mb-3">
        {renderButton('4')}
        {renderButton('5')}
        {renderButton('6')}
      </View>

      {/* Row 3: 7, 8, 9 */}
      <View className="flex-row justify-between mb-3">
        {renderButton('7')}
        {renderButton('8')}
        {renderButton('9')}
      </View>

      {/* Row 4: Decimal/Empty, 0, Delete */}
      <View className="flex-row justify-between mb-3">
        {showDecimal ? (
          renderButton('.')
        ) : (
          <View className="flex-1 h-16 mx-1.5" />
        )}
        {renderButton('0')}
        <TouchableOpacity
          onPress={handleDelete}
          className="flex-1 h-16 justify-center items-center mx-1.5 rounded-2xl bg-zinc-900/50 border border-zinc-800"
          activeOpacity={0.7}
        >
          <Delete size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Optional Confirm Button */}
      {onConfirmPress && (
        <TouchableOpacity
          onPress={handleConfirm}
          className="h-14 justify-center items-center w-full bg-blue-600 rounded-full mt-4 shadow-lg shadow-blue-900/20"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-sans-bold tracking-tight">
            {confirmLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

