/**
 * Enhanced Payment Screen
 * Version: v2.6.0
 * 
 * Features: Payment schedule, make payment, receipt view
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
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
  CheckCircle,
  AlertCircle,
  Download,
} from 'lucide-react-native';
import { useLoan } from '../../hooks/useLoans';
import { useInitiatePayment } from '../../hooks/usePayments';
import { formatNAD } from '../../utils/currency';
import { supabase } from '../../services/supabaseClient';
import { PaymentMethod } from '../../types';
import { useTheme } from '../../theme';
import { PrimaryButton, NumericKeypad } from '../../components/ui';

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
  const { colors, tokens } = useTheme();

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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Loan not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Loan Summary */}
      <View style={[styles.loanSummary, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Repayment</Text>
        <Text style={[styles.summaryAmount, { color: colors.textPrimary }]}>
          {formatNAD(loan.total_repayment)}
        </Text>
        <Text style={[styles.summarySubtext, { color: colors.textSecondary }]}>
          Monthly Payment: {formatNAD(loan.monthly_payment)}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'make-payment' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('make-payment')}
        >
          <CreditCard
            color={activeTab === 'make-payment' ? colors.primary : colors.textSecondary}
            size={20}
          />
          <Text style={[styles.tabText, { color: activeTab === 'make-payment' ? colors.primary : colors.textSecondary }]}>
            Make Payment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('schedule')}
        >
          <Calendar color={activeTab === 'schedule' ? colors.primary : colors.textSecondary} size={20} />
          <Text style={[styles.tabText, { color: activeTab === 'schedule' ? colors.primary : colors.textSecondary }]}>
            Schedule
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('history')}
        >
          <Receipt color={activeTab === 'history' ? colors.primary : colors.textSecondary} size={20} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? colors.primary : colors.textSecondary }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Make Payment Tab */}
        {activeTab === 'make-payment' && (
          <View>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment Amount</Text>
              <Pressable
                onPress={() => openAmountSheet()}
                style={[
                  styles.amountSelector,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                    borderRadius: tokens.radius.lg,
                  },
                ]}
              >
                <Text style={{ color: colors.textSecondary }}>Amount</Text>
                <Text
                  style={{
                    color: amount ? colors.textPrimary : colors.textSecondary,
                    fontSize: tokens.typography.h2.fontSize,
                    fontWeight: tokens.typography.h2.fontWeight,
                    marginTop: tokens.spacing.xs,
                  }}
                >
                  {amount ? formatNAD(parseFloat(amount)) : 'Tap to select'}
                </Text>
              </Pressable>
              {quickAmounts.length > 0 && (
                <View style={styles.quickAmounts}>
                  {quickAmounts.map((value) => {
                    const formatted = formatNAD(value);
                    const isActive = amount && Math.abs(parseFloat(amount) - Number(value.toFixed(2))) < 0.01;
                    return (
                      <Pressable
                        key={formatted}
                        onPress={() => {
                          setAmount(value.toFixed(2));
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: tokens.spacing.sm,
                          paddingHorizontal: tokens.spacing.md,
                          borderRadius: tokens.radius.pill,
                          borderWidth: 1,
                          borderColor: isActive ? colors.primary : colors.divider,
                          backgroundColor: isActive ? `${colors.primary}1A` : 'transparent',
                          alignItems: 'center',
                          marginRight: tokens.spacing.sm,
                        }}
                      >
                        <Text style={{ color: isActive ? colors.primary : colors.textSecondary }}>
                          {formatted}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment Method</Text>
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.methodCard,
                      { backgroundColor: colors.surface, borderColor: colors.divider },
                      selectedMethod === method.value && { borderColor: colors.primary, backgroundColor: `${colors.primary}1A` },
                    ]}
                    onPress={() => setSelectedMethod(method.value)}
                  >
                    <Icon color={selectedMethod === method.value ? colors.primary : colors.textSecondary} size={24} />
                    <Text
                      style={[
                        styles.methodText,
                        { color: colors.textSecondary },
                        selectedMethod === method.value && { color: colors.primary },
                      ]}
                    >
                      {method.label}
                    </Text>
                    {selectedMethod === method.value && <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedMethod === 'bank_transfer' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Reference Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.divider, color: colors.textPrimary }]}
                  placeholder="Enter transaction reference"
                  placeholderTextColor={colors.textTertiary}
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                  autoCapitalize="characters"
                />
              </View>
            )}

            <View style={[styles.actionSection]}>
              <PrimaryButton
                title={initiatePayment.isPending ? 'Processing...' : 'Submit Payment'}
                variant="primary"
                onPress={handlePayment}
                disabled={
                  initiatePayment.isPending ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  (selectedMethod === 'bank_transfer' && !referenceNumber.trim())
                }
              />
            </View>
          </View>
        )}

        {/* Payment Schedule Tab */}
        {activeTab === 'schedule' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment Schedule</Text>
            <View style={[styles.scheduleCard, { backgroundColor: colors.surface }]}>
              <View style={styles.scheduleRow}>
                <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Loan Amount:</Text>
                <Text style={[styles.scheduleValue, { color: colors.textPrimary }]}>{formatNAD(loan.amount)}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Monthly Payment:</Text>
                <Text style={[styles.scheduleValue, { color: colors.textPrimary }]}>{formatNAD(loan.monthly_payment)}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Term:</Text>
                <Text style={[styles.scheduleValue, { color: colors.textPrimary }]}>{loan.term_months} months</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Interest Rate:</Text>
                <Text style={[styles.scheduleValue, { color: colors.textPrimary }]}>{loan.interest_rate}% APR</Text>
              </View>
              <View style={[styles.scheduleRow, styles.scheduleRowTotal, { borderTopColor: colors.divider }]}>
                <Text style={[styles.scheduleLabelBold, { color: colors.textPrimary }]}>Total Repayment:</Text>
                <Text style={[styles.scheduleValueBold, { color: colors.primary }]}>{formatNAD(loan.total_repayment)}</Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: `${colors.primary}1A` }]}>
              <AlertCircle color={colors.primary} size={20} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                Payments are due on the same day each month. Late payments may incur additional
                fees.
              </Text>
            </View>
          </View>
        )}

        {/* Payment History Tab */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {loadingPayments ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : payments.length === 0 ? (
              <View style={styles.emptyState}>
                <Receipt color={colors.textTertiary} size={48} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No payments yet</Text>
              </View>
            ) : (
              payments.map((payment) => (
                <View key={payment.id} style={[styles.paymentCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentInfo}>
                      <Text style={[styles.paymentAmount, { color: colors.textPrimary }]}>{formatNAD(payment.amount)}</Text>
                      <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                        {new Date(payment.paid_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: payment.status === 'completed' ? `${colors.success}1A` : payment.status === 'pending' ? `${colors.warning}1A` : colors.surfaceAlt }
                    ]}>
                      {payment.status === 'completed' && <CheckCircle color={colors.success} size={16} />}
                      {payment.status === 'pending' && <AlertCircle color={colors.warning} size={16} />}
                      <Text style={[
                        styles.statusText,
                        { color: payment.status === 'completed' ? colors.success : payment.status === 'pending' ? colors.warning : colors.textSecondary }
                      ]}>
                        {payment.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.paymentDetails}>
                    <Text style={[styles.paymentMethod, { color: colors.textSecondary }]}>
                      {payment.payment_method.replace('_', ' ')}
                    </Text>
                    {payment.reference_number && (
                      <Text style={[styles.paymentRef, { color: colors.textTertiary }]}>Ref: {payment.reference_number}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.receiptButton, { borderTopColor: colors.divider }]}
                    onPress={() => handleDownloadReceipt(payment)}
                  >
                    <Download color={colors.primary} size={16} />
                    <Text style={[styles.receiptButtonText, { color: colors.primary }]}>View Receipt</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
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
              Enter payment amount
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                marginBottom: tokens.spacing.sm,
              }}
            >
              How much would you like to pay?
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: tokens.typography.display.fontSize,
                fontWeight: tokens.typography.display.fontWeight,
                marginBottom: tokens.spacing.md,
              }}
            >
              {formatNAD(parseFloat(sheetValue || '0'))}
            </Text>

            {sheetError && (
              <Text style={{ color: colors.error, marginBottom: tokens.spacing.sm }}>{sheetError}</Text>
            )}

            <NumericKeypad
              onNumberPress={handleNumberPress}
              onDeletePress={handleDelete}
              onConfirmPress={handleConfirmAmount}
              confirmLabel="Set amount"
              showDecimal
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
    </View>
  );
}

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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  content: {
    flex: 1,
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
  amountSelector: {
    padding: 16,
    borderWidth: 2,
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
    backgroundColor: '#ffffff',
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
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scheduleRowTotal: {
    borderBottomWidth: 0,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  scheduleLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  scheduleLabelBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  scheduleValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusTextSuccess: {
    color: '#065f46',
  },
  statusTextPending: {
    color: '#92400e',
  },
  paymentDetails: {
    marginBottom: 12,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  paymentRef: {
    fontSize: 12,
    color: '#9ca3af',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  receiptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
});
