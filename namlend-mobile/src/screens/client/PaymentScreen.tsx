/**
 * Payment Screen with Mobile Money Integration
 * Version: v2.4.2
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CreditCard, Smartphone, Building, Wallet } from 'lucide-react-native';
import { useLoan } from '../../hooks/useLoans';
import { useInitiatePayment } from '../../hooks/usePayments';
import { formatNAD, parseNAD } from '../../utils/currency';
import { PaymentMethod } from '../../types';

const PaymentScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { loanId } = route.params as { loanId: string };

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Loan not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Loan Summary */}
      <View style={styles.loanSummary}>
        <Text style={styles.summaryLabel}>Total Repayment</Text>
        <Text style={styles.summaryAmount}>
          {formatNAD(loan.total_repayment)}
        </Text>
        <Text style={styles.summarySubtext}>
          Monthly Payment: {formatNAD(loan.monthly_payment)}
        </Text>
      </View>

      {/* Payment Amount */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>N$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.quickAmounts}>
          <TouchableOpacity
            style={styles.quickAmountButton}
            onPress={() => setAmount(loan.monthly_payment.toString())}
          >
            <Text style={styles.quickAmountText}>Monthly Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAmountButton}
            onPress={() => setAmount((loan.total_repayment).toString())}
          >
            <Text style={styles.quickAmountText}>Full Balance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          return (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.methodCard,
                selectedMethod === method.value && styles.methodCardSelected,
              ]}
              onPress={() => setSelectedMethod(method.value)}
            >
              <Icon
                color={selectedMethod === method.value ? '#2563eb' : '#6b7280'}
                size={24}
              />
              <Text
                style={[
                  styles.methodText,
                  selectedMethod === method.value && styles.methodTextSelected,
                ]}
              >
                {method.label}
              </Text>
              {selectedMethod === method.value && (
                <View style={styles.selectedIndicator} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Reference Number (for bank transfer) */}
      {selectedMethod === 'bank_transfer' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter transaction reference"
            value={referenceNumber}
            onChangeText={setReferenceNumber}
          />
        </View>
      )}

      {/* Submit Button */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.submitButton, initiatePayment.isPending && styles.submitButtonDisabled]}
          onPress={handlePayment}
          disabled={initiatePayment.isPending}
        >
          <Text style={styles.submitButtonText}>
            {initiatePayment.isPending ? 'Processing...' : 'Submit Payment'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  loanSummary: {
    backgroundColor: '#ffffff',
    padding: 24,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    paddingHorizontal: 16,
    height: 60,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  methodCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  methodText: {
    flex: 1,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  methodTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  actionSection: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    height: 50,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentScreen;
