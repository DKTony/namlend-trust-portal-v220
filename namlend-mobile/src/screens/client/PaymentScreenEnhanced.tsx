/**
 * Enhanced Payment Screen
 * Version: v2.7.0 - Neo-Fintech Design
 * 
 * Features: Payment schedule, make payment, receipt view
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  CreditCard,
  Smartphone,
  Building,
  Wallet,
  Calendar,
  Receipt,
  Download,
  X,
} from 'lucide-react-native';
import { useLoan } from '../../hooks/useLoans';
import { useInitiatePayment } from '../../hooks/usePayments';
import { formatNAD } from '../../utils/currency';
import { supabase } from '../../services/supabaseClient';
import { PaymentMethod } from '../../types';
import { useTheme } from '../../theme';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import { NeoTransactionItem } from '../../components/neo/NeoTransactionItem';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import { NumericKeypad } from '../../components/ui';

type TabType = 'make-payment' | 'schedule' | 'history';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string;
  reference_number?: string;
}

export default function PaymentScreenEnhanced() {
  const route = useRoute();
  const navigation = useNavigation();
  const { loanId } = route.params as { loanId: string };
  const { colors, mode } = useTheme();

  const { data: loan, isLoading: loanLoading } = useLoan(loanId);
  const initiatePayment = useInitiatePayment();

  const [activeTab, setActiveTab] = useState<TabType>('make-payment');
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('mobile_money');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [sheetValue, setSheetValue] = useState('0');
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [amountModalVisible, setAmountModalVisible] = useState(false);

  // Theme styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const headerBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const borderColor = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const inputBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const cardBorder = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const iconColor = mode === 'dark' ? '#ffffff' : '#18181b';
  const tabBg = mode === 'dark' ? 'bg-zinc-900/50' : 'bg-zinc-100/50';

  const paymentMethods: { value: PaymentMethod; label: string; icon: any }[] = [
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
    { value: 'debit_order', label: 'Debit Order', icon: Wallet },
  ];

  const quickAmounts = useMemo(() => {
    const values: number[] = [];
    if (loan?.monthly_payment) values.push(loan.monthly_payment);
    if (loan?.total_repayment) values.push(loan.total_repayment);
    if (loan?.total_repayment) values.push(loan.total_repayment / 2);
    return values.slice(0, 3);
  }, [loan?.monthly_payment, loan?.total_repayment]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadPaymentHistory();
    }
  }, [activeTab]);

  const loadPaymentHistory = async () => {
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('loan_id', loanId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const openAmountSheet = () => {
    const baseValue = amount ? parseFloat(amount) : loan?.monthly_payment ?? 0;
    const normalized = Number.isFinite(baseValue) ? baseValue : 0;
    setSheetValue(normalized > 0 ? normalized.toFixed(2) : '0');
    setSheetError(null);
    setAmountModalVisible(true);
  };

  const handleNumberPress = (value: string) => {
    setSheetError(null);
    setSheetValue((prev) => {
      if (value === '.' && prev.includes('.')) {
        return prev;
      }
      if (prev === '0' && value !== '.') {
        return value;
      }
      const next = prev + value;
      return next.length > 8 ? prev : next;
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

  const handleConfirmAmount = () => {
    const numericValue = parseFloat(sheetValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setSheetError('Enter a valid amount');
      return;
    }
    setAmount(numericValue.toFixed(2));
    setAmountModalVisible(false);
  };

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
                    onPress: () => {
                      setAmount('');
                      setReferenceNumber('');
                      setActiveTab('history');
                    },
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

  const handleDownloadReceipt = (payment: Payment) => {
    Alert.alert(
      'Receipt',
      `Payment Receipt\n\nAmount: ${formatNAD(payment.amount)}\nMethod: ${payment.payment_method}\nStatus: ${payment.status}\nDate: ${new Date(payment.paid_at).toLocaleDateString()}\nReference: ${payment.reference_number || 'N/A'}`,
      [{ text: 'OK' }]
    );
  };

  if (loanLoading) {
    return (
      <View className={`flex-1 ${containerBg} justify-center items-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!loan) {
    return (
      <View className={`flex-1 ${containerBg} justify-center items-center`}>
        <Text className="text-red-500 font-sans-medium text-lg">Loan not found</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${containerBg}`}>
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      {/* Loan Summary Header */}
      <View className={`px-6 pt-16 pb-6 ${headerBg} border-b ${borderColor}`}>
        <View className="flex-row justify-between items-start">
          <View>
            <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
              TOTAL REPAYMENT
            </Text>
            <Text className={`${textColor} text-3xl font-sans-bold tracking-tight mb-1`}>
              {formatNAD(loan.total_repayment)}
            </Text>
            <Text className={`${subTextColor} text-sm font-sans`}>
              Monthly Payment: <Text className={`${textColor} font-sans-medium`}>{formatNAD(loan.monthly_payment)}</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()} className={`p-2 ${mode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'} rounded-full`}>
            <X size={20} color={mode === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View className={`flex-row border-b ${borderColor} ${tabBg}`}>
        {[
          { id: 'make-payment', label: 'Pay', icon: CreditCard },
          { id: 'schedule', label: 'Schedule', icon: Calendar },
          { id: 'history', label: 'History', icon: Receipt },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 flex-row items-center justify-center py-4 border-b-2 ${
              activeTab === tab.id ? 'border-blue-600' : 'border-transparent'
            }`}
          >
            <tab.icon
              size={18}
              color={activeTab === tab.id ? '#3b82f6' : (mode === 'dark' ? '#71717a' : '#94a3b8')}
            />
            <Text
              className={`ml-2 text-sm font-sans-medium ${
                activeTab === tab.id ? 'text-blue-500' : subTextColor
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1">
        {/* Make Payment Tab */}
        {activeTab === 'make-payment' && (
          <View className="p-6">
            <View className="mb-8">
              <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>Payment Amount</Text>
              <Pressable
                onPress={() => openAmountSheet()}
                className={`${inputBg} border ${mode === 'dark' ? 'border-blue-500/50' : 'border-blue-200'} rounded-3xl p-8 items-center shadow-lg shadow-blue-500/10`}
              >
                <Text className={`${subTextColor} text-xs font-sans-medium mb-2 uppercase tracking-widest`}>
                  ENTER AMOUNT
                </Text>
                <Text className={`text-5xl font-sans-bold ${textColor} tracking-tighter`}>
                  {amount ? formatNAD(parseFloat(amount)) : 'N$ 0.00'}
                </Text>
              </Pressable>

              <View className="flex-row gap-3 mt-4">
                {quickAmounts.map((val, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setAmount(val.toFixed(2))}
                    className={`flex-1 py-3 ${inputBg} border ${borderColor} rounded-xl items-center`}
                  >
                    <Text className={`${subTextColor} text-xs font-sans-bold`}>
                      {formatNAD(val)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-8">
              <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>Payment Method</Text>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  onPress={() => setSelectedMethod(method.value)}
                  className={`flex-row items-center p-4 rounded-2xl border mb-3 ${
                    selectedMethod === method.value
                      ? 'bg-blue-600/10 border-blue-600'
                      : `${inputBg} ${borderColor}`
                  }`}
                >
                  <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                    selectedMethod === method.value 
                      ? 'bg-blue-600' 
                      : (mode === 'dark' ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-100 border border-zinc-200')
                  }`}>
                    <method.icon size={24} color={selectedMethod === method.value ? 'white' : (mode === 'dark' ? '#71717a' : '#94a3b8')} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-sans-medium ${
                      selectedMethod === method.value ? 'text-blue-500' : textColor
                    }`}>
                      {method.label}
                    </Text>
                  </View>
                  {selectedMethod === method.value && (
                    <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                      <View className="w-2.5 h-2.5 rounded-full bg-white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <NeoButton
              title="Confirm Payment"
              onPress={handlePayment}
              variant="primary"
              size="lg"
              className="shadow-lg shadow-blue-900/20"
            />
          </View>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <View className="p-6">
            <View className={`bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 mb-6 flex-row`}>
              <Calendar color="#3b82f6" size={24} />
              <Text className="ml-3 text-blue-500 text-sm font-sans flex-1 leading-5">
                Payments are due on the 1st of each month. Late payments may incur additional fees.
              </Text>
            </View>

            <NeoCard variant="glass" className="p-0 overflow-hidden">
              <View className={`${mode === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-100/50'} px-5 py-3 border-b ${borderColor} flex-row justify-between`}>
                <Text className={`${subTextColor} text-xs font-sans-bold uppercase tracking-wider`}>Date</Text>
                <Text className={`${subTextColor} text-xs font-sans-bold uppercase tracking-wider`}>Amount</Text>
              </View>
              
              {/* Mock Schedule Data - In real app, map through actual schedule */}
              <View className="p-2">
                {[1, 2, 3].map((item) => (
                  <View key={item} className={`flex-row justify-between items-center py-4 px-3 border-b ${mode === 'dark' ? 'border-zinc-800/50' : 'border-zinc-100/50'} last:border-0`}>
                    <View>
                      <Text className={`${textColor} text-sm font-sans-bold`}>Dec 01, 2025</Text>
                      <Text className={`${subTextColor} text-xs font-sans-medium mt-0.5`}>Pending</Text>
                    </View>
                    <Text className={`${textColor} text-sm font-sans-bold tracking-tight`}>
                      {formatNAD(loan.monthly_payment)}
                    </Text>
                  </View>
                ))}
              </View>

              <View className={`${mode === 'dark' ? 'bg-zinc-800/30' : 'bg-zinc-50'} px-5 py-4 border-t ${borderColor} flex-row justify-between`}>
                <Text className={`${subTextColor} font-sans-bold`}>Total Remaining</Text>
                <Text className="text-blue-500 font-sans-bold tracking-tight">{formatNAD(loan.total_repayment)}</Text>
              </View>
            </NeoCard>
          </View>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <View className="p-6">
            {loadingPayments ? (
              <ActivityIndicator color="#3b82f6" className="mt-8" />
            ) : payments.length === 0 ? (
              <View className="items-center py-16">
                <Receipt color={mode === 'dark' ? "#3f3f46" : "#cbd5e1"} size={64} />
                <Text className={`${textColor} text-lg font-sans-bold mt-6 mb-2 tracking-tight`}>
                  No Payments Yet
                </Text>
                <Text className={`${subTextColor} text-center px-8 font-sans`}>
                  Your payment history will appear here once you make your first payment.
                </Text>
              </View>
            ) : (
              payments.map((payment) => (
                <View key={payment.id} className={`${inputBg} border ${borderColor} rounded-2xl mb-4 overflow-hidden`}>
                  <View className="p-4 flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className={`${textColor} text-xl font-sans-bold mb-1 tracking-tight`}>
                        {formatNAD(payment.amount)}
                      </Text>
                      <Text className={`${subTextColor} text-xs font-sans`}>
                        {new Date(payment.paid_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className={`px-2.5 py-1 rounded-full ${
                      payment.status === 'completed' ? 'bg-emerald-500/10' : 'bg-yellow-500/10'
                    }`}>
                      <Text className={`text-[10px] font-sans-bold uppercase tracking-wide ${
                        payment.status === 'completed' ? 'text-emerald-500' : 'text-yellow-500'
                      }`}>
                        {payment.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="px-4 pb-4">
                    <Text className={`${subTextColor} text-xs capitalize mb-1 font-sans-medium`}>
                      via {payment.payment_method.replace('_', ' ')}
                    </Text>
                    {payment.reference_number && (
                      <Text className={`${subTextColor} text-[10px] font-sans`}>
                        Ref: {payment.reference_number}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity 
                    onPress={() => handleDownloadReceipt(payment)}
                    className={`${mode === 'dark' ? 'bg-zinc-800/30' : 'bg-zinc-50'} py-3 flex-row items-center justify-center border-t ${borderColor}`}
                  >
                    <Download size={14} color="#3b82f6" />
                    <Text className="text-blue-500 text-xs font-sans-bold ml-2">
                      View Receipt
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Amount Modal */}
      <Modal
        visible={amountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAmountModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/90">
          <View className={`${containerBg} rounded-t-[32px] p-6 w-full border-t ${borderColor} shadow-2xl`}>
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className={`${textColor} text-xl font-sans-bold tracking-tight`}>Enter Amount</Text>
                <Text className={`${subTextColor} text-xs tracking-wide uppercase`}>
                  How much would you like to pay?
                </Text>
              </View>
              <Pressable onPress={() => setAmountModalVisible(false)} className={`p-2 ${inputBg} rounded-full border ${borderColor}`}>
                <X size={20} color={mode === 'dark' ? "#a1a1aa" : "#71717a"} />
              </Pressable>
            </View>

            <View className="items-center mb-8">
              <Text className={`${textColor} text-5xl font-sans-bold tracking-tighter`}>
                {formatNAD(parseFloat(sheetValue || '0'))}
              </Text>
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
              showDecimal
            />
            
            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

