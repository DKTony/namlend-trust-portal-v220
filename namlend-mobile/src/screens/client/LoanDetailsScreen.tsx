/**
 * Loan Details Screen
 * Version: v2.7.1 - Theme system integration
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreditCard, Calendar, TrendingUp, FileText, DollarSign } from 'lucide-react-native';
import { useLoan, useRepaymentSchedule } from '../../hooks/useLoans';
import { usePaymentStats } from '../../hooks/usePayments';
import { formatNAD, formatPercentage } from '../../utils/currency';
import { useTheme } from '../../theme';
import { BalanceCard, CurrencyCard, PrimaryButton } from '../../components/ui';
import type { ClientStackParamList } from '../../navigation/ClientStack';

const LoanDetailsScreen: React.FC = () => {
  const { colors, tokens } = useTheme();
  const route = useRoute<RouteProp<ClientStackParamList, 'LoanDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList, 'LoanDetails'>>();
  const { loanId } = route.params;

  const { data: loan, isLoading: loanLoading } = useLoan(loanId);
  const { data: schedule, isLoading: scheduleLoading } = useRepaymentSchedule(loanId);
  const { data: paymentStats } = usePaymentStats(loanId);

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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Loan Amount */}
      <View style={[styles.summarySection, { paddingHorizontal: tokens.spacing.base }]}>
        <BalanceCard
          amount={loan.amount}
          label="Loan Amount"
          subtitle={`${loan.term_months} months at ${formatPercentage(loan.interest_rate)}`}
          style={{ marginBottom: tokens.spacing.base }}
        />
      </View>

      {/* Key Metrics */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.metricsSection, { paddingLeft: tokens.spacing.base }]}
        contentContainerStyle={{ paddingRight: tokens.spacing.base }}
      >
        <CurrencyCard
          icon={DollarSign}
          label="Monthly Payment"
          primaryValue={formatNAD(loan.monthly_payment)}
          secondaryValue="Per month"
          style={{ marginRight: tokens.spacing.base, width: 160 }}
        />
        <CurrencyCard
          icon={TrendingUp}
          label="Total Repayment"
          primaryValue={formatNAD(loan.total_repayment)}
          secondaryValue="Amount due"
          style={{ marginRight: tokens.spacing.base, width: 160 }}
        />
        {loan.disbursed_at && (
          <CurrencyCard
            icon={Calendar}
            label="Disbursed"
            primaryValue={new Date(loan.disbursed_at).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' })}
            secondaryValue={formatNAD(loan.monthly_payment)}
            style={{ marginRight: tokens.spacing.base, width: 160 }}
          />
        )}
      </ScrollView>

      {/* Loan Details */}
      <View style={[styles.section, { paddingHorizontal: tokens.spacing.base }]}>
        <Text style={[styles.sectionTitle, {
          color: colors.textPrimary,
          fontSize: tokens.typography.h2.fontSize,
          fontWeight: tokens.typography.h2.fontWeight,
        }]}>Loan Details</Text>
        <View style={[styles.detailsCard, {
          backgroundColor: colors.surface,
          borderRadius: tokens.radius.md,
          ...tokens.shadows.card,
        }]}>
          <DetailRow label="Purpose" value={loan.purpose || 'N/A'} colors={colors} />
          <DetailRow label="Term" value={`${loan.term_months} months`} colors={colors} />
          <DetailRow label="Total Repayment" value={formatNAD(loan.total_repayment)} colors={colors} />
          <DetailRow label="Monthly Payment" value={formatNAD(loan.monthly_payment)} colors={colors} />
          <DetailRow label="Status" value={loan.status.toUpperCase()} colors={colors} />
          {loan.disbursed_at && (
            <DetailRow 
              label="Disbursed Date" 
              value={new Date(loan.disbursed_at).toLocaleDateString('en-NA')} 
              colors={colors}
            />
          )}
        </View>
      </View>

      {/* Payment Statistics */}
      {paymentStats && (
        <View style={[styles.section, { paddingHorizontal: tokens.spacing.base }]}>
          <Text style={[styles.sectionTitle, {
            color: colors.textPrimary,
            fontSize: tokens.typography.h2.fontSize,
            fontWeight: tokens.typography.h2.fontWeight,
          }]}>Payment Summary</Text>
          <View style={styles.statsGrid}>
            <CurrencyCard
              icon={CreditCard}
              label="Total Paid"
              primaryValue={formatNAD(paymentStats.totalPaid)}
              style={{ flex: 1, marginRight: tokens.spacing.sm }}
            />
            <CurrencyCard
              icon={Calendar}
              label="Payments Made"
              primaryValue={paymentStats.paymentCount.toString()}
              secondaryValue="Completed"
              style={{ flex: 1, marginLeft: tokens.spacing.sm }}
            />
          </View>
        </View>
      )}

      {/* Repayment Schedule */}
      {schedule && schedule.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: tokens.spacing.base }]}>
          <Text style={[styles.sectionTitle, {
            color: colors.textPrimary,
            fontSize: tokens.typography.h2.fontSize,
            fontWeight: tokens.typography.h2.fontWeight,
          }]}>Repayment Schedule</Text>
          {schedule.map((payment, index) => (
            <View key={payment.id} style={[styles.scheduleItem, {
              backgroundColor: colors.surface,
              borderRadius: tokens.radius.sm,
            }]}>
              <View style={styles.scheduleLeft}>
                <Text style={[styles.scheduleNumber, { color: colors.textTertiary }]}>#{index + 1}</Text>
                <View>
                  <Text style={[styles.scheduleAmount, { color: colors.textPrimary }]}>{formatNAD(payment.amount)}</Text>
                  <Text style={[styles.scheduleDate, { color: colors.textSecondary }]}>
                    {new Date(payment.payment_date).toLocaleDateString('en-NA')}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.scheduleStatus,
                { backgroundColor: payment.status === 'completed' ? colors.success : colors.warning }
              ]}>
                <Text style={styles.scheduleStatusText}>
                  {payment.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Make Payment Button */}
      {(loan.status === 'active' || loan.status === 'disbursed') && (
        <View style={[styles.actionSection, { paddingHorizontal: tokens.spacing.base }]}>
          <PrimaryButton
            title="Make Payment"
            onPress={() => navigation.navigate('Payment', { loanId: loan.id })}
            variant="primary"
          />
        </View>
      )}
    </ScrollView>
  );
};

const DetailRow: React.FC<{ label: string; value: string; colors: any }> = ({ label, value, colors }) => (
  <View style={styles.detailRow}>
    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  summarySection: {
    paddingTop: 16,
  },
  metricsSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  detailsCard: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleDate: {
    fontSize: 12,
    marginTop: 4,
  },
  scheduleStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scheduleStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionSection: {
    paddingVertical: 24,
  },
});

export default LoanDetailsScreen;
