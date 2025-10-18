/**
 * Avatar - NamLend Mobile v2.7.0
 * Circular profile image with fallback initials
 */

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface AvatarProps {
  imageUri?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
  testID?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  imageUri,
  name = 'User',
  size = 64,
  style,
  testID,
}) => {
  const { colors, tokens } = useTheme();

  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 2,
          borderColor: `${colors.textPrimary}1A`, // 10% opacity
        },
        style,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              color: colors.textPrimary,
              fontSize: size * 0.4,
              fontWeight: tokens.typography.h1.fontWeight,
            },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    textAlign: 'center',
  },
});
