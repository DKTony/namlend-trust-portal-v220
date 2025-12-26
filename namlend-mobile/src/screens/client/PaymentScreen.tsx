/**
 * Payment Screen with Mobile Money Integration
 * Version: v2.7.1 - Neo-Fintech Theme Update
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Smartphone, Building, Wallet, ArrowLeft } from 'lucide-react-native';
import { useLoan } from '../../hooks/useLoans';
import { useInitiatePayment } from '../../hooks/usePayments';
import { formatNAD } from '../../utils/currency';
import { PaymentMethod } from '../../types';
import { useTheme } from '../../theme';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';

const PaymentScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { loanId } = route.params as { loanId: string };
  const { mode } = useTheme();

  const { data: loan, isLoading } = useLoan(loanId);
  const initiatePayment = useInitiatePayment();

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('mobile_money');
  const [referenceNumber, setReferenceNumber] = useState('');

  const paymentMethods: { value: PaymentMethod; label: string; icon: any }[] = [
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
    { value: 'debit_order', label: 'Debit Order', icon: Wallet },
  ];

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    if (selectedMethod === 'bank_transfer' && !referenceNumber) {
      Alert.alert('Error', 'Please enter a reference number for bank transfer');
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay ${formatNAD(parseFloat(amount))} via ${selectedMethod.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const result = await initiatePayment.mutateAsync({
              loanId,
              amount: parseFloat(amount),
              paymentMethod: selectedMethod,
              referenceNumber: referenceNumber || undefined,
            });

            if (result.success) {
              Alert.alert(
                'Payment Initiated',
                'Your payment has been submitted for processing',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } else {
              Alert.alert('Payment Failed', result.error || 'Unknown error');
            }
          },
        },
      ]
    );
  };

  // Theme-derived styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const headerBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const borderColor = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const inputBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const placeholderColor = mode === 'dark' ? '#71717a' : '#94a3b8';

  if (isLoading) {
    return (
      <View className={`flex-1 ${containerBg} justify-center items-center`}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!loan) {
    return (
      <View className={`flex-1 ${containerBg} justify-center items-center`}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
        <Text className="text-red-500 font-sans-medium text-base">Loan not found</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${containerBg}`}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      {mode === 'dark' && <AmbientGlow position="top" />}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header with Back Button */}
        <View className={`px-6 pt-16 pb-6 ${headerBg} border-b ${borderColor}`}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="mb-4 flex-row items-center"
          >
            <ArrowLeft size={20} color={mode === 'dark' ? '#fff' : '#18181b'} />
            <Text className={`${textColor} ml-2 font-sans-medium`}>Back</Text>
          </TouchableOpacity>
          
          <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
            TOTAL REPAYMENT
          </Text>
          <Text className={`${textColor} text-3xl font-sans-bold tracking-tight mb-1`}>
            {formatNAD(loan.total_repayment)}
          </Text>
          <Text className={`${subTextColor} text-sm font-sans`}>
            Monthly Payment: {formatNAD(loan.monthly_payment)}
          </Text>
        </View>

        {/* Payment Amount */}
        <View className="p-6">
          <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>
            Payment Amount
          </Text>
          
          <NeoCard variant="glass" className="p-0 overflow-hidden mb-4">
            <View className={`flex-row items-center ${inputBg} border-2 border-blue-500 rounded-2xl px-4 h-16`}>
              <Text className={`${textColor} text-2xl font-sans-bold mr-2`}>N$</Text>
              <TextInput
                className={`flex-1 text-2xl font-sans-semibold ${textColor}`}
                placeholder="0.00"
                placeholderTextColor={placeholderColor}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </NeoCard>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 py-3 ${inputBg} border ${borderColor} rounded-xl items-center`}
              onPress={() => setAmount(loan.monthly_payment.toString())}
            >
              <Text className={`${subTextColor} text-xs font-sans-bold`}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 ${inputBg} border ${borderColor} rounded-xl items-center`}
              onPress={() => setAmount(loan.total_repayment.toString())}
            >
              <Text className={`${subTextColor} text-xs font-sans-bold`}>Full Balance</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View className="px-6 mb-6">
          <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>
            Payment Method
          </Text>
          
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.value;
            return (
              <TouchableOpacity
                key={method.value}
                onPress={() => setSelectedMethod(method.value)}
                className={`flex-row items-center p-4 rounded-2xl border mb-3 ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-600'
                    : `${inputBg} ${borderColor}`
                }`}
              >
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                  isSelected 
                    ? 'bg-blue-600' 
                    : (mode === 'dark' ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-100 border border-zinc-200')
                }`}>
                  <Icon size={24} color={isSelected ? 'white' : (mode === 'dark' ? '#71717a' : '#94a3b8')} />
                </View>
                <View className="flex-1">
                  <Text className={`text-base font-sans-medium ${isSelected ? 'text-blue-500' : textColor}`}>
                    {method.label}
                  </Text>
                </View>
                {isSelected && (
                  <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                    <View className="w-2.5 h-2.5 rounded-full bg-white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reference Number (for bank transfer) */}
        {selectedMethod === 'bank_transfer' && (
          <View className="px-6 mb-6">
            <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>
              Reference Number
            </Text>
            <TextInput
              className={`h-14 ${inputBg} border ${borderColor} rounded-xl px-4 text-base ${textColor}`}
              placeholder="Enter transaction reference"
              placeholderTextColor={placeholderColor}
              value={referenceNumber}
              onChangeText={setReferenceNumber}
            />
          </View>
        )}

        {/* Submit Button */}
        <View className="px-6 pb-8">
          <NeoButton
            title={initiatePayment.isPending ? 'Processing...' : 'Submit Payment'}
            onPress={handlePayment}
            variant="primary"
            size="lg"
            disabled={initiatePayment.isPending}
            className="shadow-lg shadow-blue-900/20"
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default PaymentScreen;
