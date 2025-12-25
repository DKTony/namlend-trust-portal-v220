/**
 * Loan Application Form Screen
 * Version: v2.7.0 - Neo-Fintech Design
 * 
 * Multi-step loan application form with validation and offline support
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ArrowLeft, Check, AlertCircle, DollarSign, Calendar, Briefcase, CreditCard } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { LoanService } from '../../services/loanService';
import { formatNAD } from '../../utils/currency';
import { enqueue } from '../../utils/offlineQueue';
import { useTheme } from '../../theme';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoInput } from '../../components/neo/NeoInput';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import type { ClientStackParamList } from '../../navigation/ClientStack';

const MAX_APR = parseInt(process.env.EXPO_PUBLIC_MAX_APR || '32', 10);
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 50000;
const ALLOWED_TERMS = [1, 3, 5];
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
  const { colors, mode } = useTheme();
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

  // Theme constants
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const headerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-white';
  const borderColor = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const inputBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const cardBorder = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const iconColor = mode === 'dark' ? '#ffffff' : '#18181b';

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
    } else if (!ALLOWED_TERMS.includes(term)) {
      newErrors.term = 'Allowed terms are 1, 3, or 5 months';
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${containerBg}`}
    >
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      {/* Header */}
      <View className={`flex-row items-center px-4 pt-16 pb-4 ${headerBg} border-b ${borderColor}`}>
        <TouchableOpacity onPress={handleBack} className={`p-2 -ml-2 rounded-full ${inputBg} border ${borderColor}`}>
          <ArrowLeft color={iconColor} size={24} />
        </TouchableOpacity>
        <View className="ml-4 flex-1">
          <Text className={`${textColor} text-lg font-sans-bold tracking-tight`}>Loan Application</Text>
          <Text className={`${subTextColor} text-xs font-sans-medium tracking-wide uppercase`}>Step {step} of 3</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className={`h-1 ${mode === 'dark' ? 'bg-zinc-900' : 'bg-zinc-200'} w-full`}>
        <View className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Step 1: Loan Details */}
        {step === 1 && (
          <View>
            <Text className={`text-2xl font-sans-bold ${textColor} mb-2 tracking-tight`}>Loan Details</Text>
            <Text className={`${subTextColor} text-sm mb-8 font-sans`}>Choose your loan amount and repayment term</Text>

            <NeoInput
              label="LOAN AMOUNT (NAD)"
              placeholder="5000"
              keyboardType="numeric"
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              error={errors.amount}
              icon={<DollarSign size={20} color={mode === 'dark' ? "#71717a" : "#9ca3af"} />}
              testID="amount-input"
            />

            <View className="mb-6">
              <Text className={`${subTextColor} text-xs font-sans-medium mb-2 ml-1`}>LOAN TERM</Text>
              <View className="flex-row justify-between gap-2">
                {[1, 3, 5].map((termValue) => (
                  <TouchableOpacity
                    key={termValue}
                    onPress={() => setFormData({ ...formData, term: termValue.toString() })}
                    className={`flex-1 py-3 px-2 rounded-xl border ${
                      formData.term === termValue.toString()
                        ? 'bg-blue-600/20 border-blue-500'
                        : `${inputBg} ${borderColor}`
                    }`}
                    testID={termValue === 1 ? 'term-input' : undefined}
                  >
                    <Text
                      className={`text-center font-sans-bold ${
                        formData.term === termValue.toString() ? 'text-blue-400' : subTextColor
                      }`}
                    >
                      {termValue} Month{termValue > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.term && <Text className="text-red-400 text-xs mt-1 ml-1">{errors.term}</Text>}
            </View>

            <NeoInput
              label="PURPOSE OF LOAN"
              placeholder="e.g., Home improvement, education..."
              value={formData.purpose}
              onChangeText={(text) => setFormData({ ...formData, purpose: text })}
              error={errors.purpose}
              multiline
              numberOfLines={3}
              containerClassName="h-32"
              testID="purpose-input"
            />

            {/* Loan Calculation Preview */}
            {loanDetails.amount > 0 && loanDetails.term > 0 && (
              <NeoCard variant="glass" className="mt-4 p-5">
                <Text className={`${textColor} text-sm font-sans-bold tracking-tight mb-4`}>ESTIMATED REPAYMENT</Text>
                
                <View className="flex-row justify-between mb-3">
                  <Text className={`${subTextColor} text-sm font-sans`}>Monthly Payment:</Text>
                  <Text className={`${textColor} text-sm font-sans-bold tracking-tight`}>{formatNAD(loanDetails.monthlyPayment)}</Text>
                </View>
                
                <View className="flex-row justify-between mb-3">
                  <Text className={`${subTextColor} text-sm font-sans`}>Total Repayment:</Text>
                  <Text className={`${textColor} text-sm font-sans-bold tracking-tight`}>{formatNAD(loanDetails.totalRepayment)}</Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className={`${subTextColor} text-sm font-sans`}>Interest Rate:</Text>
                  <Text className="text-emerald-500 text-sm font-sans-bold">{MAX_APR}% APR</Text>
                </View>

                <View className="flex-row items-center bg-yellow-500/10 p-3 rounded-lg mt-4 border border-yellow-500/20">
                  <AlertCircle color="#f59e0b" size={16} />
                  <Text className="text-yellow-500 text-xs ml-2 flex-1 font-sans-medium">
                    Representative APR: up to {MAX_APR}% p.a.
                  </Text>
                </View>
              </NeoCard>
            )}
          </View>
        )}

        {/* Step 2: Financial Information */}
        {step === 2 && (
          <View>
            <Text className={`text-2xl font-sans-bold ${textColor} mb-2 tracking-tight`}>Financial Info</Text>
            <Text className={`${subTextColor} text-sm mb-8 font-sans`}>Tell us about your financial situation</Text>

            <View className="mb-6">
              <Text className={`${subTextColor} text-xs font-sans-medium mb-2 ml-1`}>EMPLOYMENT STATUS</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { label: 'Full-time', value: 'employed_full_time' },
                  { label: 'Part-time', value: 'employed_part_time' },
                  { label: 'Self-employed', value: 'self_employed' },
                  { label: 'Retired', value: 'retired' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setFormData({ ...formData, employment_status: option.value })}
                    className={`py-2.5 px-4 rounded-full border mb-2 ${
                      formData.employment_status === option.value
                        ? 'bg-blue-600/20 border-blue-500'
                        : `${inputBg} ${borderColor}`
                    }`}
                  >
                    <Text
                      className={`text-sm font-sans-medium ${
                        formData.employment_status === option.value ? 'text-blue-400' : subTextColor
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.employment_status && (
                <Text className="text-red-400 text-xs mt-1 ml-1">{errors.employment_status}</Text>
              )}
            </View>

            <NeoInput
              label="MONTHLY INCOME (NAD)"
              placeholder="5000"
              keyboardType="numeric"
              value={formData.monthly_income}
              onChangeText={(text) => setFormData({ ...formData, monthly_income: text })}
              error={errors.monthly_income}
              icon={<DollarSign size={20} color={mode === 'dark' ? "#71717a" : "#9ca3af"} />}
              testID="income-input"
            />

            <NeoInput
              label="MONTHLY EXPENSES (NAD)"
              placeholder="3000"
              keyboardType="numeric"
              value={formData.monthly_expenses}
              onChangeText={(text) => setFormData({ ...formData, monthly_expenses: text })}
              error={errors.monthly_expenses}
              icon={<CreditCard size={20} color={mode === 'dark' ? "#71717a" : "#9ca3af"} />}
              testID="expenses-input"
            />

            <NeoInput
              label="EXISTING DEBT (NAD)"
              placeholder="0"
              keyboardType="numeric"
              value={formData.existing_debt}
              onChangeText={(text) => setFormData({ ...formData, existing_debt: text })}
              icon={<AlertCircle size={20} color={mode === 'dark' ? "#71717a" : "#9ca3af"} />}
            />
          </View>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <View>
            <Text className={`text-2xl font-sans-bold ${textColor} mb-2 tracking-tight`}>Review</Text>
            <Text className={`${subTextColor} text-sm mb-8 font-sans`}>Please review your application details</Text>

            <NeoCard variant="glass" className="mb-4 p-5">
              <Text className={`${subTextColor} text-xs font-sans-medium mb-4 uppercase tracking-wider`}>Loan Details</Text>
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className={`${subTextColor} font-sans`}>Amount</Text>
                  <Text className={`${textColor} font-sans-bold tracking-tight`}>{formatNAD(loanDetails.amount)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`${subTextColor} font-sans`}>Term</Text>
                  <Text className={`${textColor} font-sans-medium`}>{loanDetails.term} months</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`${subTextColor} font-sans`}>Purpose</Text>
                  <Text className={`${textColor} font-sans-medium flex-1 text-right ml-4`} numberOfLines={1}>{formData.purpose}</Text>
                </View>
              </View>
            </NeoCard>

            <NeoCard variant="glass" className="mb-4 p-5">
              <Text className={`${subTextColor} text-xs font-sans-medium mb-4 uppercase tracking-wider`}>Financials</Text>
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className={`${subTextColor} font-sans`}>Employment</Text>
                  <Text className={`${textColor} font-sans-medium capitalize`}>
                    {formData.employment_status.replace(/_/g, ' ')}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`${subTextColor} font-sans`}>Income</Text>
                  <Text className={`${textColor} font-sans-bold tracking-tight`}>{formatNAD(parseFloat(formData.monthly_income))}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`${subTextColor} font-sans`}>Expenses</Text>
                  <Text className={`${textColor} font-sans-bold tracking-tight`}>{formatNAD(parseFloat(formData.monthly_expenses))}</Text>
                </View>
              </View>
            </NeoCard>

            <NeoCard variant="elevated" className="mb-6 p-5 border-blue-500/20">
              <Text className={`${subTextColor} text-xs font-sans-medium mb-4 uppercase tracking-wider`}>Summary</Text>
              <View className="space-y-3">
                <View className="flex-row justify-between items-center">
                  <Text className={`${subTextColor} font-sans`}>Monthly Payment</Text>
                  <Text className="text-blue-500 font-sans-bold text-xl tracking-tight">
                    {formatNAD(loanDetails.monthlyPayment)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`${subTextColor} font-sans`}>Total Repayment</Text>
                  <Text className={`${textColor} font-sans-bold tracking-tight`}>{formatNAD(loanDetails.totalRepayment)}</Text>
                </View>
              </View>
            </NeoCard>

            <View className="flex-row items-start p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-8">
              <Check color="#3b82f6" size={20} />
              <Text className="ml-3 text-blue-500 text-xs flex-1 leading-5 font-sans">
                By submitting this application, you confirm that all information provided is accurate
                and complete. Your application will be reviewed within 24-48 hours.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View className={`px-6 py-4 ${headerBg} border-t ${borderColor}`}>
        {step < 3 ? (
          <NeoButton
            title="Next Step"
            onPress={handleNext}
            variant="primary"
            size="lg"
          />
        ) : (
          <NeoButton
            title={loading ? 'Submitting...' : 'Submit Application'}
            onPress={handleSubmit}
            loading={loading}
            variant="success"
            size="lg"
            className="bg-emerald-500/10 border-emerald-500/50"
            textClassName="text-emerald-500"
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}


