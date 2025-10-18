/**
 * Loan Application Form Screen
 * Version: v2.6.0
 * 
 * Multi-step loan application form with validation and offline support
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { LoanService } from '../../services/loanService';
import { formatNAD } from '../../utils/currency';
import { enqueue } from '../../utils/offlineQueue';
import { useTheme } from '../../theme';
import { PrimaryButton, CurrencyCard } from '../../components/ui';
import type { ClientStackParamList } from '../../navigation/ClientStack';

const MAX_APR = parseInt(process.env.EXPO_PUBLIC_MAX_APR || '32', 10);
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 50000;
const MIN_TERM = 3;
const MAX_TERM = 36;
const MIN_INCOME = 2000;

interface FormData {
  amount: string;
  term: string;
  purpose: string;
  employment_status: string;
  monthly_income: string;
  monthly_expenses: string;
  existing_debt: string;
}

interface LoanDetails {
  amount: number;
  term: number;
  interestRate: number;
  monthlyPayment: number;
  totalRepayment: number;
}

export default function LoanApplicationFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ClientStackParamList, 'LoanApplicationForm'>>();
  const prefilledAmount = route.params?.amount ? route.params.amount.toString() : '';
  const { user } = useAuth();
  const { colors, tokens } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    amount: prefilledAmount,
    term: '',
    purpose: '',
    employment_status: '',
    monthly_income: '',
    monthly_expenses: '',
    existing_debt: '0',
  });

  const [loanDetails, setLoanDetails] = useState<LoanDetails>({
    amount: 0,
    term: 0,
    interestRate: MAX_APR,
    monthlyPayment: 0,
    totalRepayment: 0,
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Calculate loan details when amount or term changes
  useEffect(() => {
    const amount = parseFloat(formData.amount);
    const term = parseInt(formData.term);

    if (amount > 0 && term > 0) {
      calculateLoanDetails(amount, term);
    }
  }, [formData.amount, formData.term]);

  const calculateLoanDetails = (amount: number, term: number) => {
    const principal = amount;
    const monthlyRate = MAX_APR / 100 / 12; // Convert APR to monthly rate
    const monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
      (Math.pow(1 + monthlyRate, term) - 1);
    const totalRepayment = monthlyPayment * term;

    setLoanDetails({
      amount: principal,
      term,
      interestRate: MAX_APR,
      monthlyPayment,
      totalRepayment,
    });
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<FormData> = {};
    const amount = parseFloat(formData.amount);
    const term = parseInt(formData.term);

    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Loan amount is required';
    } else if (amount < MIN_AMOUNT) {
      newErrors.amount = `Minimum loan amount is ${formatNAD(MIN_AMOUNT)}`;
    } else if (amount > MAX_AMOUNT) {
      newErrors.amount = `Maximum loan amount is ${formatNAD(MAX_AMOUNT)}`;
    }

    if (!formData.term || isNaN(term)) {
      newErrors.term = 'Loan term is required';
    } else if (term < MIN_TERM) {
      newErrors.term = `Minimum term is ${MIN_TERM} months`;
    } else if (term > MAX_TERM) {
      newErrors.term = `Maximum term is ${MAX_TERM} months`;
    }

    if (!formData.purpose || formData.purpose.trim().length < 10) {
      newErrors.purpose = 'Please provide a detailed purpose (minimum 10 characters)';
    } else if (formData.purpose.length > 500) {
      newErrors.purpose = 'Purpose must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<FormData> = {};
    const income = parseFloat(formData.monthly_income);
    const expenses = parseFloat(formData.monthly_expenses);

    if (!formData.employment_status) {
      newErrors.employment_status = 'Employment status is required';
    }

    if (!formData.monthly_income || isNaN(income)) {
      newErrors.monthly_income = 'Monthly income is required';
    } else if (income < MIN_INCOME) {
      newErrors.monthly_income = `Minimum monthly income is ${formatNAD(MIN_INCOME)}`;
    }

    if (!formData.monthly_expenses || isNaN(expenses)) {
      newErrors.monthly_expenses = 'Monthly expenses are required';
    } else if (expenses >= income) {
      newErrors.monthly_expenses = 'Expenses must be less than income';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) {
      return;
    }
    if (step === 2 && !validateStep2()) {
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to submit your application.');
      return;
    }

    setLoading(true);

    try {
      const loanApplicationData = {
        amount: loanDetails.amount,
        term_months: loanDetails.term,
        interest_rate: loanDetails.interestRate,
        monthly_payment: loanDetails.monthlyPayment,
        total_repayment: loanDetails.totalRepayment,
        purpose: formData.purpose,
        employment_status: formData.employment_status,
        monthly_income: parseFloat(formData.monthly_income),
        monthly_expenses: parseFloat(formData.monthly_expenses),
        existing_debt: parseFloat(formData.existing_debt || '0'),
        user_verified: false,
        credit_score: 650, // Default - would come from credit check in production
        submitted_at: new Date().toISOString(),
      };

      // Try to submit directly
      const result = await LoanService.submitLoanApplication(user.id, loanApplicationData);

      if (result.success) {
        Alert.alert(
          'Application Submitted!',
          "Your loan application has been submitted for review. You'll be notified once it's processed.",
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('DashboardTab' as never),
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Loan application submission error:', error);

      // Add to offline queue if submission fails
      try {
        await enqueue({
          type: 'loan_application',
          payload: {
            user_id: user.id,
            ...formData,
            loan_details: loanDetails,
          },
        });

        Alert.alert(
          'Queued for Submission',
          'Your application has been saved and will be submitted when you have an internet connection.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('DashboardTab' as never),
            },
          ]
        );
      } catch (queueError) {
        Alert.alert(
          'Submission Failed',
          'Failed to submit your application. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Loan Application</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Step {step} of 3</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>{Math.round(progress)}% complete</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Loan Details */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Loan Details</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>Choose your loan amount and repayment term</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Loan Amount (NAD)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: errors.amount ? colors.error : colors.divider, color: colors.textPrimary },
                ]}
                placeholder="5000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
              />
              {errors.amount && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.amount}</Text>
              )}
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Between {formatNAD(MIN_AMOUNT)} and {formatNAD(MAX_AMOUNT)}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Loan Term (months)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: errors.term ? colors.error : colors.divider, color: colors.textPrimary },
                ]}
                placeholder="12"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={formData.term}
                onChangeText={(text) => setFormData({ ...formData, term: text })}
              />
              {errors.term && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.term}</Text>
              )}
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Between {MIN_TERM} and {MAX_TERM} months
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Purpose of Loan</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surface, borderColor: errors.purpose ? colors.error : colors.divider, color: colors.textPrimary },
                ]}
                placeholder="e.g., Home improvement, education, medical expenses..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                value={formData.purpose}
                onChangeText={(text) => setFormData({ ...formData, purpose: text })}
                maxLength={500}
              />
              {errors.purpose && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.purpose}</Text>
              )}
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                {formData.purpose.length}/500 characters
              </Text>
            </View>

            {/* Loan Calculation Preview */}
            {loanDetails.amount > 0 && loanDetails.term > 0 && (
              <View style={[styles.calculationCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.calculationTitle, { color: colors.textPrimary }]}>Estimated Repayment</Text>
                <View style={styles.calculationRow}>
                  <Text style={[styles.calculationLabel, { color: colors.textSecondary }]}>Monthly Payment:</Text>
                  <Text style={[styles.calculationValue, { color: colors.textPrimary }]}>
                    {formatNAD(loanDetails.monthlyPayment)}
                  </Text>
                </View>
                <View style={styles.calculationRow}>
                  <Text style={[styles.calculationLabel, { color: colors.textSecondary }]}>Total Repayment:</Text>
                  <Text style={[styles.calculationValue, { color: colors.textPrimary }]}>
                    {formatNAD(loanDetails.totalRepayment)}
                  </Text>
                </View>
                <View style={styles.calculationRow}>
                  <Text style={[styles.calculationLabel, { color: colors.textSecondary }]}>Interest Rate:</Text>
                  <Text style={[styles.calculationValue, { color: colors.textPrimary }]}>{MAX_APR}% APR</Text>
                </View>
                <View style={[styles.aprNotice, { backgroundColor: `${colors.warning}1A` }]}>
                  <AlertCircle color={colors.warning} size={16} />
                  <Text style={[styles.aprNoticeText, { color: colors.warning }]}>
                    Representative APR: up to {MAX_APR}% p.a.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Financial Information */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Financial Information</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>Tell us about your financial situation</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Employment Status</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[styles.picker, { borderColor: errors.employment_status ? colors.error : colors.divider, backgroundColor: colors.surface }]}
                  onPress={() => {
                    Alert.alert('Select Employment Status', '', [
                      {
                        text: 'Employed Full-time',
                        onPress: () =>
                          setFormData({ ...formData, employment_status: 'employed_full_time' }),
                      },
                      {
                        text: 'Employed Part-time',
                        onPress: () =>
                          setFormData({ ...formData, employment_status: 'employed_part_time' }),
                      },
                      {
                        text: 'Self-employed',
                        onPress: () =>
                          setFormData({ ...formData, employment_status: 'self_employed' }),
                      },
                      {
                        text: 'Retired',
                        onPress: () =>
                          setFormData({ ...formData, employment_status: 'retired' }),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                >
                  <Text style={[styles.pickerText, { color: formData.employment_status ? colors.textPrimary : colors.textTertiary }]}>
                    {formData.employment_status
                      ? formData.employment_status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                      : 'Select employment status'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.employment_status && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.employment_status}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Income (NAD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.monthly_income ? colors.error : colors.divider, color: colors.textPrimary }]}
                placeholder="5000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={formData.monthly_income}
                onChangeText={(text) => setFormData({ ...formData, monthly_income: text })}
              />
              {errors.monthly_income && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.monthly_income}</Text>
              )}
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Minimum {formatNAD(MIN_INCOME)} required
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Expenses (NAD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.monthly_expenses ? colors.error : colors.divider, color: colors.textPrimary }]}
                placeholder="3000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={formData.monthly_expenses}
                onChangeText={(text) => setFormData({ ...formData, monthly_expenses: text })}
              />
              {errors.monthly_expenses && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.monthly_expenses}</Text>
              )}
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Include rent, utilities, food, transport, etc.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Existing Debt (NAD) - Optional</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.divider, color: colors.textPrimary }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={formData.existing_debt}
                onChangeText={(text) => setFormData({ ...formData, existing_debt: text })}
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Total monthly debt payments (loans, credit cards, etc.)
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Review & Submit</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>Please review your application details</Text>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Loan Details</Text>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Amount:</Text>
                <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{formatNAD(loanDetails.amount)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Term:</Text>
                <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{loanDetails.term} months</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Purpose:</Text>
                <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{formData.purpose}</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Financial Information</Text>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Employment:</Text>
                <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>
                  {formData.employment_status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Monthly Income:</Text>
                <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{formatNAD(parseFloat(formData.monthly_income))}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Monthly Expenses:</Text>
                <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{formatNAD(parseFloat(formData.monthly_expenses))}</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Repayment Summary</Text>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Monthly Payment:</Text>
                <Text style={[styles.reviewValue, { color: colors.primary, fontWeight: '600' }]}>
                  {formatNAD(loanDetails.monthlyPayment)}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Total Repayment:</Text>
                <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{formatNAD(loanDetails.totalRepayment)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Interest Rate:</Text>
                <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{MAX_APR}% APR</Text>
              </View>
            </View>

            <View style={[styles.finalNotice, { backgroundColor: `${colors.primary}1A` }]}>
              <AlertCircle color={colors.primary} size={20} />
              <Text style={[styles.finalNoticeText, { color: colors.primary }]}>
                By submitting this application, you confirm that all information provided is accurate
                and complete. Your application will be reviewed within 24-48 hours.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        {step < 3 ? (
          <PrimaryButton
            title="Next"
            onPress={handleNext}
            variant="primary"
          />
        ) : (
          <PrimaryButton
            title={loading ? 'Submitting...' : 'Submit Application'}
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  stepContainer: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  calculationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  aprNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  aprNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  reviewHighlight: {
    color: '#2563eb',
    fontWeight: '600',
  },
  finalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  finalNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
