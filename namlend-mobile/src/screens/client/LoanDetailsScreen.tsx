/**
 * Loan Details Screen
 * Version: v2.7.1 - Neo-Fintech Design
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreditCard, Calendar, TrendingUp, DollarSign, Clock, FileText, ArrowLeft } from 'lucide-react-native';
import { useLoan, useRepaymentSchedule } from '../../hooks/useLoans';
import { usePaymentStats } from '../../hooks/usePayments';
import { formatNAD, formatPercentage } from '../../utils/currency';
import { useTheme } from '../../theme';
import { NeoBalanceCard } from '../../components/neo/NeoBalanceCard';
import { NeoCurrencyCard } from '../../components/neo/NeoCurrencyCard';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import type { ClientStackParamList } from '../../navigation/ClientStack';

const LoanDetailsScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const route = useRoute<RouteProp<ClientStackParamList, 'LoanDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList, 'LoanDetails'>>();
  const { loanId } = route.params;

  const { data: loan, isLoading: loanLoading } = useLoan(loanId);
  const { data: schedule, isLoading: scheduleLoading } = useRepaymentSchedule(loanId);
  const { data: paymentStats } = usePaymentStats(loanId);

  // Theme styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-500';
  const headerBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const borderColor = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const cardBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const scheduleHeaderBg = mode === 'dark' ? 'bg-zinc-800/50' : 'bg-zinc-100/50';
  const scheduleItemBorder = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-100';
  const iconColor = mode === 'dark' ? '#ffffff' : '#18181b';

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
      
      {/* Header */}
      <View className={`px-6 pt-16 pb-4 flex-row items-center justify-between ${mode === 'dark' ? '' : 'bg-white border-b border-zinc-200'}`}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className={`p-2 rounded-full ${mode === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100 border border-zinc-200'}`}
        >
          <ArrowLeft size={20} color={mode === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text className={`${textColor} text-lg font-sans-bold`}>Loan Details</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1">
        <View className="px-6 pt-6 pb-6">
          <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
            LOAN DETAILS
          </Text>
          <Text className={`${textColor} text-3xl font-sans-bold tracking-tight mb-6`}>
            {formatNAD(loan.amount)}
          </Text>

          {/* Main Balance Card */}
          <NeoBalanceCard
            amount={loan.amount}
            label="LOAN AMOUNT"
            subtitle={`${loan.term_months} months at ${formatPercentage(loan.interest_rate)}`}
            className="mb-8"
          />

          {/* Key Metrics */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-8 -mx-6 px-6"
          >
            <NeoCurrencyCard
              icon={DollarSign}
              label="MONTHLY PAYMENT"
              primaryValue={formatNAD(loan.monthly_payment)}
              secondaryValue="Per month"
              className="mr-4"
              variant="glass"
            />
            <NeoCurrencyCard
              icon={TrendingUp}
              label="TOTAL REPAYMENT"
              primaryValue={formatNAD(loan.total_repayment)}
              secondaryValue="Amount due"
              className="mr-4"
              variant="glass"
            />
            {loan.disbursed_at && (
              <NeoCurrencyCard
                icon={Calendar}
                label="DISBURSED"
                primaryValue={new Date(loan.disbursed_at).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' })}
                secondaryValue={formatNAD(loan.monthly_payment)}
                className="mr-4"
                variant="glass"
              />
            )}
          </ScrollView>

          {/* Loan Details Card */}
          <NeoCard variant="glass" className="mb-6 p-5">
            <Text className={`${subTextColor} text-xs font-sans-medium mb-4 uppercase tracking-wider`}>
              Information
            </Text>
            <View className="space-y-4">
              <DetailRow label="Purpose" value={loan.purpose || 'N/A'} mode={mode} />
              <DetailRow label="Term" value={`${loan.term_months} months`} mode={mode} />
              <DetailRow label="Total Repayment" value={formatNAD(loan.total_repayment)} mode={mode} />
              <DetailRow label="Monthly Payment" value={formatNAD(loan.monthly_payment)} mode={mode} />
              <DetailRow 
                label="Status" 
                value={loan.status.toUpperCase()} 
                mode={mode}
                valueColor={
                  loan.status === 'active' || loan.status === 'disbursed' ? 'text-emerald-500' : 
                  loan.status === 'completed' ? 'text-blue-500' : undefined
                }
              />
              {loan.disbursed_at && (
                <DetailRow 
                  label="Disbursed Date" 
                  value={new Date(loan.disbursed_at).toLocaleDateString('en-NA')} 
                  mode={mode}
                />
              )}
            </View>
          </NeoCard>

          {/* Payment Statistics */}
          {paymentStats && (
            <View className="mb-6">
              <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>Payment Summary</Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <NeoCurrencyCard
                    icon={CreditCard}
                    label="TOTAL PAID"
                    primaryValue={formatNAD(paymentStats.totalPaid)}
                    variant="glass"
                  />
                </View>
                <View className="flex-1">
                  <NeoCurrencyCard
                    icon={Calendar}
                    label="PAYMENTS MADE"
                    primaryValue={paymentStats.paymentCount.toString()}
                    secondaryValue="Completed"
                    variant="glass"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Repayment Schedule */}
          {schedule && schedule.length > 0 && (
            <View className="mb-24">
              <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>Repayment Schedule</Text>
              <NeoCard variant="glass" className="p-0 overflow-hidden">
                {schedule.map((payment, index) => (
                  <View 
                    key={payment.id} 
                    className={`flex-row justify-between items-center py-4 px-4 border-b ${scheduleItemBorder} last:border-0`}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 border ${mode === 'dark' ? 'bg-zinc-800 border-zinc-700/50' : 'bg-zinc-100 border-zinc-200'}`}>
                        <Text className={`${subTextColor} text-xs font-sans-bold`}>#{index + 1}</Text>
                      </View>
                      <View>
                        <Text className={`${textColor} text-sm font-sans-bold tracking-tight`}>
                          {formatNAD(payment.amount)}
                        </Text>
                        <Text className={`${subTextColor} text-xs font-sans`}>
                          {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('en-NA') : 'Pending'}
                        </Text>
                      </View>
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
                ))}
              </NeoCard>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Make Payment Button */}
      {(loan.status === 'active' || loan.status === 'disbursed') && (
        <View className="absolute bottom-6 right-6 left-6">
          <NeoButton
            title="Make Payment"
            onPress={() => navigation.navigate('Payment', { loanId: loan.id })}
            variant="primary"
            size="lg"
            className="shadow-lg shadow-blue-900/30"
          />
        </View>
      )}
    </View>
  );
};

const DetailRow: React.FC<{ label: string; value: string; valueColor?: string; mode: string }> = ({ 
  label, 
  value,
  valueColor,
  mode
}) => (
  <View className="flex-row justify-between items-center">
    <Text className="text-zinc-500 text-sm font-sans">{label}</Text>
    <Text className={`${valueColor || (mode === 'dark' ? 'text-zinc-100' : 'text-zinc-900')} text-sm font-sans-medium`}>{value}</Text>
  </View>
);

export default LoanDetailsScreen;


