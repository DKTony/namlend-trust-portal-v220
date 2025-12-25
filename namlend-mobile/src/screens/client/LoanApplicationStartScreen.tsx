import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
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
  ChevronRight,
  X,
} from 'lucide-react-native';
import { formatNAD } from '../../utils/currency';
import { useTheme } from '../../theme';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import { NumericKeypad } from '../../components/ui';
import type { ClientStackParamList } from '../../navigation/ClientStack';

const MAX_APR = parseInt(process.env.EXPO_PUBLIC_MAX_APR || '32', 10);
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 50000;

export default function LoanApplicationStartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList, 'LoanApplicationStart'>>();
  const { colors, mode } = useTheme();

  const [agreed, setAgreed] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [sheetValue, setSheetValue] = useState(`${MIN_AMOUNT}`);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [amountModalVisible, setAmountModalVisible] = useState(false);

  // Theme styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const cardBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const iconContainerBg = mode === 'dark' ? 'bg-zinc-800 border-zinc-700/50' : 'bg-zinc-100 border-zinc-200';
  const modalBg = mode === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200';
  const checkboxBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300';
  const inputBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200';
  const closeButtonBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200';
  const iconColor = mode === 'dark' ? '#a1a1aa' : '#71717a';

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
    <View className={`flex-1 ${containerBg}`}>
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 32,
        }}
      >
        <View className="mb-8">
          <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
            LOAN APPLICATION
          </Text>
          <Text className={`${textColor} text-3xl font-sans-bold tracking-tight mb-2`}>
            Apply for a Loan
          </Text>
          <Text className={`${subTextColor} text-base font-sans leading-6`}>
            Get quick access to funds with transparent terms and fair rates.
          </Text>
        </View>

        {/* Eligibility Card */}
        <NeoCard variant="glass" className="mb-6 p-5">
          <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>
            Eligibility Requirements
          </Text>

          {[
            `Namibian citizen or permanent resident`,
            `Age 18 years or older`,
            `Regular monthly income (min ${formatNAD(2000)})`,
            `Valid ID or passport`,
            `Proof of address`,
          ].map((requirement, index) => (
            <View
              key={index}
              className="flex-row items-center mb-3 last:mb-0"
            >
              <CheckCircle color="#22c55e" size={18} />
              <Text className={`ml-3 ${mode === 'dark' ? 'text-zinc-300' : 'text-zinc-600'} text-sm font-sans`}>
                {requirement}
              </Text>
            </View>
          ))}
        </NeoCard>

        {/* Features Card */}
        <NeoCard variant="glass" className="mb-6 p-5">
          <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>
            Loan Features
          </Text>

          {[
            {
              icon: DollarSign,
              title: 'Flexible Amounts',
              text: `Borrow ${formatNAD(MIN_AMOUNT)} - ${formatNAD(MAX_AMOUNT)}`,
            },
            {
              icon: Clock,
              title: 'Flexible Terms',
              text: 'Repayment terms: 1, 3, or 5 months',
            },
            {
              icon: Shield,
              title: 'Transparent Rates',
              text: `Representative APR: up to ${MAX_APR}% p.a.`,
            },
          ].map(({ icon: Icon, title, text }, index) => (
            <View key={index} className="flex-row items-start mb-5 last:mb-0">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 border ${iconContainerBg}`}>
                <Icon color="#3b82f6" size={20} />
              </View>
              <View className="flex-1 pt-1">
                <Text className={`${mode === 'dark' ? 'text-zinc-100' : 'text-zinc-800'} text-sm font-sans-bold tracking-tight mb-0.5`}>
                  {title}
                </Text>
                <Text className={`${subTextColor} text-xs font-sans`}>
                  {text}
                </Text>
              </View>
            </View>
          ))}

          <View className={`flex-row items-start p-3 ${mode === 'dark' ? 'bg-zinc-800/50' : 'bg-orange-50'} rounded-xl mt-2 border border-orange-500/20`}>
            <AlertCircle color="#f97316" size={18} />
            <Text className={`ml-2 ${mode === 'dark' ? 'text-orange-400' : 'text-orange-600'} text-xs font-sans flex-1 leading-5`}>
              Interest rates up to {MAX_APR}% APR per annum in compliance with Namibian regulations.
            </Text>
          </View>
        </NeoCard>

        {/* Amount Selection */}
        <NeoCard variant="elevated" className="mb-6 p-5">
          <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
            SELECTED AMOUNT
          </Text>
          <Text className={`${textColor} text-4xl font-sans-bold tracking-tighter mb-2`}>
            {formattedSelectedAmount}
          </Text>
          <Text className={`${subTextColor} text-xs font-sans mb-6`}>
            Choose between {formatNAD(MIN_AMOUNT)} and {formatNAD(MAX_AMOUNT)}.
          </Text>

          <NeoButton
            title="Choose loan amount"
            variant="secondary"
            onPress={openAmountSheet}
            icon={<DollarSign size={18} color={mode === 'dark' ? 'white' : '#1f2937'} />}
          />
        </NeoCard>

        {/* Terms Agreement */}
        <Pressable
          className="flex-row items-start mb-8 p-2"
          onPress={() => setAgreed((prev) => !prev)}
          testID="terms-agreement-checkbox"
        >
          <View
            className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 ${
              agreed ? 'bg-blue-600 border-blue-600' : checkboxBg
            }`}
          >
            {agreed && <CheckCircle color="white" size={14} />}
          </View>
          <Text className={`flex-1 ${subTextColor} text-sm font-sans leading-5 pt-0.5`}>
            I have read and agree to the <Text className="text-blue-500 font-sans-medium">terms and conditions</Text> and{' '}
            <Text className="text-blue-500 font-sans-medium">privacy policy</Text>.
          </Text>
        </Pressable>

        <NeoButton
          title="Continue to Application"
          onPress={handleContinue}
          disabled={!agreed || !selectedAmount}
          variant="primary"
          size="lg"
          className="mb-4 shadow-lg shadow-blue-900/20"
          icon={<ChevronRight size={20} color="white" />}
        />

        <Text className={`${mode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'} text-xs text-center px-4 font-sans mb-8`}>
          Applications are reviewed within 24-48 hours. We'll notify you via email and in-app alerts.
        </Text>
      </ScrollView>

      {/* Amount Picker Modal */}
      <Modal
        visible={amountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAmountModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/90">
          <View className={`${modalBg} rounded-t-[32px] p-6 w-full border-t shadow-2xl`}>
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className={`${textColor} text-xl font-sans-bold tracking-tight`}>Select Amount</Text>
                <Text className={`${subTextColor} text-xs tracking-wide`}>
                  RANGE: {formatNAD(MIN_AMOUNT)} - {formatNAD(MAX_AMOUNT)}
                </Text>
              </View>
              <Pressable onPress={() => setAmountModalVisible(false)} className={`p-2 rounded-full border ${closeButtonBg}`}>
                <X size={20} color={iconColor} />
              </Pressable>
            </View>

            <View className="items-center mb-8">
              <Text className={`${textColor} text-5xl font-sans-bold tracking-tighter`}>
                {formatNAD(parseInt(sheetValue, 10) || 0)}
              </Text>
            </View>

            <View className="flex-row flex-wrap justify-center mb-8 gap-2">
              {quickAmounts.map((value) => {
                const isActive = parseInt(sheetValue, 10) === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => handleQuickAmount(value)}
                    className={`px-4 py-2.5 rounded-full border ${
                      isActive ? 'bg-blue-600 border-blue-500' : inputBg
                    }`}
                  >
                    <Text
                      className={`text-xs font-sans-bold ${
                        isActive ? 'text-white' : subTextColor
                      }`}
                    >
                      {formatNAD(value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {sheetError && (
              <Text className="text-red-400 text-xs text-center mb-4 font-sans-medium">
                {sheetError}
              </Text>
            )}

            <NumericKeypad
              onNumberPress={handleNumberPress}
              onDeletePress={handleDelete}
              onConfirmPress={handleConfirmAmount}
              confirmLabel="Set Amount"
              showDecimal={false}
            />
            
            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

