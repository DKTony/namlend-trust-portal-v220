import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CheckCircle,
  AlertCircle,
  DollarSign,
  Clock,
  Shield,
} from 'lucide-react-native';
import { formatNAD } from '../../utils/currency';
import { useTheme } from '../../theme';
import { PrimaryButton, NumericKeypad } from '../../components/ui';
import type { ClientStackParamList } from '../../navigation/ClientStack';

const MAX_APR = parseInt(process.env.EXPO_PUBLIC_MAX_APR || '32', 10);
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 50000;

export default function LoanApplicationStartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList, 'LoanApplicationStart'>>();
  const { colors, tokens } = useTheme();

  const [agreed, setAgreed] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [sheetValue, setSheetValue] = useState(`${MIN_AMOUNT}`);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [amountModalVisible, setAmountModalVisible] = useState(false);

  const quickAmounts = useMemo(() => [5000, 10000, 20000, 30000, 40000], []);

  const openAmountSheet = () => {
    setSheetValue(`${selectedAmount ?? MIN_AMOUNT}`);
    setSheetError(null);
    setAmountModalVisible(true);
  };

  const handleNumberPress = (value: string) => {
    setSheetError(null);
    setSheetValue((prev) => {
      if (prev === '0' && value !== '.') {
        return value;
      }
      const next = prev + value;
      return next.length > 7 ? prev : next;
    });
  };

  const handleDelete = () => {
    setSheetError(null);
    setSheetValue((prev) => {
      if (prev.length <= 1) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  };

  const handleQuickAmount = (value: number) => {
    setSheetError(null);
    setSheetValue(`${value}`);
  };

  const handleConfirmAmount = () => {
    const numericValue = parseInt(sheetValue, 10);
    if (Number.isNaN(numericValue)) {
      setSheetError('Enter a valid amount');
      return;
    }
    if (numericValue < MIN_AMOUNT || numericValue > MAX_AMOUNT) {
      setSheetError(`Amount must be between ${formatNAD(MIN_AMOUNT)} and ${formatNAD(MAX_AMOUNT)}`);
      return;
    }
    setSelectedAmount(numericValue);
    setAmountModalVisible(false);
  };

  const handleContinue = () => {
    if (!selectedAmount) {
      Alert.alert('Select Amount', 'Please choose your desired loan amount before continuing.');
      return;
    }

    if (!agreed) {
      Alert.alert(
        'Terms Required',
        'Please read and agree to the terms and conditions before continuing.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate('LoanApplicationForm', { amount: selectedAmount });
  };

  const formattedSelectedAmount = selectedAmount ? formatNAD(selectedAmount) : 'Select loan amount';

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingHorizontal: tokens.spacing.base,
          paddingBottom: tokens.spacing['3xl'],
          paddingTop: tokens.spacing['2xl'],
        }}
      >
        <View style={{ marginBottom: tokens.spacing['2xl'] }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: tokens.typography.caption.fontSize,
              lineHeight: tokens.typography.caption.lineHeight,
            }}
          >
            Loan Application
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.h1.fontSize,
              lineHeight: tokens.typography.h1.lineHeight,
              fontWeight: tokens.typography.h1.fontWeight,
              marginTop: tokens.spacing.xs,
            }}
          >
            Apply for a Loan
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: tokens.typography.body.fontSize,
              lineHeight: tokens.typography.body.lineHeight,
              marginTop: tokens.spacing.sm,
            }}
          >
            Get quick access to funds with transparent terms and fair rates.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: tokens.radius.lg,
              padding: tokens.spacing.lg,
              marginBottom: tokens.spacing.lg,
              ...tokens.shadows.card,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.h2.fontSize,
              fontWeight: tokens.typography.h2.fontWeight,
              marginBottom: tokens.spacing.md,
            }}
          >
            Eligibility Requirements
          </Text>

          {[`Namibian citizen or permanent resident`,
            `Age 18 years or older`,
            `Regular monthly income (minimum ${formatNAD(2000)})`,
            `Valid ID or passport`,
            `Proof of address (utility bill or bank statement)`,
          ].map((requirement) => (
            <View
              key={requirement}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: tokens.spacing.sm,
              }}
            >
              <CheckCircle color={colors.success} size={20} />
              <Text
                style={{
                  marginLeft: tokens.spacing.sm,
                  color: colors.textSecondary,
                  fontSize: tokens.typography.body.fontSize,
                }}
              >
                {requirement}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: tokens.radius.lg,
              padding: tokens.spacing.lg,
              marginBottom: tokens.spacing.lg,
              ...tokens.shadows.card,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.h2.fontSize,
              fontWeight: tokens.typography.h2.fontWeight,
              marginBottom: tokens.spacing.md,
            }}
          >
            Loan Features
          </Text>

          {[
            {
              icon: DollarSign,
              title: 'Flexible Amounts',
              text: `Borrow from ${formatNAD(MIN_AMOUNT)} to ${formatNAD(MAX_AMOUNT)}`,
            },
            {
              icon: Clock,
              title: 'Flexible Terms',
              text: 'Repayment terms available: 1, 3, or 5 months',
            },
            {
              icon: Shield,
              title: 'Transparent Rates',
              text: `Representative APR: up to ${MAX_APR}% p.a.`,
            },
          ].map(({ icon: Icon, title, text }) => (
            <View
              key={title}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: tokens.spacing.md,
              }}
            >
              <Icon color={colors.primary} size={24} />
              <View style={{ marginLeft: tokens.spacing.md, flex: 1 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: tokens.typography.bodyMedium.fontSize,
                    fontWeight: tokens.typography.bodyMedium.fontWeight,
                    marginBottom: tokens.spacing.xs,
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: tokens.typography.body.fontSize,
                    lineHeight: tokens.typography.body.lineHeight,
                  }}
                >
                  {text}
                </Text>
              </View>
            </View>
          ))}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              padding: tokens.spacing.md,
              borderRadius: tokens.radius.md,
              backgroundColor: `${colors.warning}1A`,
            }}
          >
            <AlertCircle color={colors.warning} size={20} />
            <Text
              style={{
                marginLeft: tokens.spacing.sm,
                color: colors.warning,
                fontSize: tokens.typography.caption.fontSize,
                lineHeight: tokens.typography.caption.lineHeight,
              }}
            >
              Interest rates up to {MAX_APR}% APR per annum in compliance with Namibian regulations.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: tokens.radius.lg,
              padding: tokens.spacing.lg,
              marginBottom: tokens.spacing.lg,
              ...tokens.shadows.card,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.bodyMedium.fontSize,
              fontWeight: tokens.typography.bodyMedium.fontWeight,
            }}
          >
            Selected Amount
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.display.fontSize,
              fontWeight: tokens.typography.display.fontWeight,
              marginTop: tokens.spacing.sm,
            }}
          >
            {formattedSelectedAmount}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              marginTop: tokens.spacing.sm,
              fontSize: tokens.typography.caption.fontSize,
            }}
          >
            Choose an amount between {formatNAD(MIN_AMOUNT)} and {formatNAD(MAX_AMOUNT)}.
          </Text>

          <PrimaryButton
            title="Choose loan amount"
            variant="secondary"
            onPress={openAmountSheet}
            style={{ marginTop: tokens.spacing.lg }}
          />
        </View>

        <Pressable
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: tokens.spacing.lg,
          }}
          onPress={() => setAgreed((prev) => !prev)}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: tokens.radius.sm,
              borderWidth: 2,
              borderColor: agreed ? colors.primary : colors.divider,
              backgroundColor: agreed ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: tokens.spacing.md,
            }}
          >
            {agreed && <CheckCircle color="#FFFFFF" size={16} />}
          </View>
          <Text
            style={{
              flex: 1,
              color: colors.textSecondary,
              fontSize: tokens.typography.body.fontSize,
              lineHeight: tokens.typography.body.lineHeight,
            }}
          >
            I have read and agree to the <Text style={{ color: colors.primary }}>terms and conditions</Text> and{' '}
            <Text style={{ color: colors.primary }}>privacy policy</Text>.
          </Text>
        </Pressable>

        <PrimaryButton
          title="Continue to application"
          onPress={handleContinue}
          disabled={!agreed || !selectedAmount}
          style={{ marginBottom: tokens.spacing.md }}
          textStyle={{ textTransform: 'capitalize' }}
        />

        <View style={{ alignItems: 'center', marginTop: tokens.spacing.sm }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: tokens.typography.caption.fontSize,
              lineHeight: tokens.typography.caption.lineHeight,
              textAlign: 'center',
            }}
          >
            Applications are reviewed within 24-48 hours. We'll notify you via email and in-app alerts.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={amountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAmountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: tokens.radius['2xl'],
              borderTopRightRadius: tokens.radius['2xl'],
              paddingHorizontal: tokens.spacing.xl,
              paddingTop: tokens.spacing.xl,
              paddingBottom: tokens.spacing['2xl'],
              width: '100%',
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: tokens.typography.h2.fontSize,
                fontWeight: tokens.typography.h2.fontWeight,
                marginBottom: tokens.spacing.sm,
              }}
            >
              Select loan amount
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: tokens.typography.caption.fontSize,
                marginBottom: tokens.spacing.sm,
              }}
            >
              Range: {formatNAD(MIN_AMOUNT)} - {formatNAD(MAX_AMOUNT)}
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: tokens.typography.display.fontSize,
                fontWeight: tokens.typography.display.fontWeight,
                marginBottom: tokens.spacing.md,
              }}
            >
              {formatNAD(parseInt(sheetValue, 10) || 0)}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginBottom: tokens.spacing.lg,
              }}
            >
              {quickAmounts.map((value) => {
                const isActive = parseInt(sheetValue, 10) === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => handleQuickAmount(value)}
                    style={{
                      paddingVertical: tokens.spacing.sm,
                      paddingHorizontal: tokens.spacing.md,
                      borderRadius: tokens.radius.pill,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.divider,
                      backgroundColor: isActive ? `${colors.primary}1A` : 'transparent',
                      marginRight: tokens.spacing.sm,
                      marginBottom: tokens.spacing.sm,
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? colors.primary : colors.textSecondary,
                        fontSize: tokens.typography.caption.fontSize,
                      }}
                    >
                      {formatNAD(value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {sheetError && (
              <Text
                style={{
                  color: colors.error,
                  fontSize: tokens.typography.caption.fontSize,
                  marginBottom: tokens.spacing.sm,
                }}
              >
                {sheetError}
              </Text>
            )}

            <NumericKeypad
              onNumberPress={handleNumberPress}
              onDeletePress={handleDelete}
              onConfirmPress={handleConfirmAmount}
              confirmLabel="Set amount"
              showDecimal={false}
            />

            <PrimaryButton
              title="Cancel"
              variant="secondary"
              onPress={() => setAmountModalVisible(false)}
              style={{ marginTop: tokens.spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    // Dynamic styling applied inline
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});

