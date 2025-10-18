/**
 * BottomSheet - NamLend Mobile v2.7.0
 * Modal bottom sheet with gesture support using @gorhom/bottom-sheet
 */

import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '../../theme';

interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
  snapPoints?: (string | number)[];
  enablePanDownToClose?: boolean;
  onClose?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  (
    {
      children,
      title,
      snapPoints: customSnapPoints,
      enablePanDownToClose = true,
      onClose,
      style,
      testID,
    },
    ref
  ) => {
    const { colors, tokens } = useTheme();

    // Default snap points: 50% and 90% of screen height
    const snapPoints = useMemo(
      () => customSnapPoints || ['50%', '90%'],
      [customSnapPoints]
    );

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
        />
      ),
      []
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        onClose={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.background,
          borderTopLeftRadius: tokens.radius['2xl'],
          borderTopRightRadius: tokens.radius['2xl'],
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.textTertiary,
          width: 40,
          height: 4,
        }}
        style={[
          {
            ...tokens.shadows.sheet,
          },
          style,
        ]}
      >
        <BottomSheetView style={styles.contentContainer}>
          {title && (
            <View
              style={[
                styles.header,
                {
                  paddingHorizontal: tokens.spacing.xl,
                  paddingBottom: tokens.spacing.base,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.divider,
                },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.textPrimary,
                    fontSize: tokens.typography.h1.fontSize,
                    fontWeight: tokens.typography.h1.fontWeight,
                    lineHeight: tokens.typography.h1.lineHeight,
                  },
                ]}
              >
                {title}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.content,
              {
                paddingHorizontal: tokens.spacing.xl,
                paddingTop: tokens.spacing.base,
              },
            ]}
          >
            {children}
          </View>
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
  },
  title: {
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
});
