/**
 * Loans List Screen
 * Version: v2.7.1 - Theme system integration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileText, DollarSign, Calendar, TrendingUp, Plus } from 'lucide-react-native';
import { useMyLoans } from '../../hooks/useLoans';
import { formatNAD } from '../../utils/currency';
import { Loan } from '../../types';
import { useTheme } from '../../theme';
import { BalanceCard, TransactionItem, PrimaryButton } from '../../components/ui';
import type { ClientStackParamList } from '../../navigation/ClientStack';

const LoansListScreen: React.FC = () => {
  const { colors, tokens } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList, 'LoansList'>>();
  const { data: loans, isLoading, refetch } = useMyLoans();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'approved' | 'completed'>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredLoans = loans?.filter(loan => {
    if (filter === 'all') return true;
    if (filter === 'active') return loan.status === 'active' || loan.status === 'disbursed';
    if (filter === 'approved') return loan.status === 'approved';
    if (filter === 'completed') return loan.status === 'completed';
    return true;
  }) || [];

  // Calculate totals
  const totalOutstanding = loans?.reduce((sum, loan) => 
    loan.status === 'active' || loan.status === 'disbursed' ? sum + (loan.total_repayment || loan.amount) : sum, 0) || 0;
  const activeLoansCount = loans?.filter(l => l.status === 'active' || l.status === 'disbursed').length || 0;

  const renderLoanItem = ({ item }: { item: Loan }) => {
    return (
      <TransactionItem
        title={`${formatNAD(item.amount)} Loan`}
        subtitle={`${item.term_months} months • ${formatNAD(item.monthly_payment)}/mo • ${item.status}`}
        amount={item.total_repayment || item.amount}
        type={item.status === 'completed' ? 'income' : 'expense'}
        icon={DollarSign}
        onPress={() => navigation.navigate('LoanDetails', { loanId: item.id })}
      />
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Summary Cards */}
      <View style={[styles.summarySection, { paddingHorizontal: tokens.spacing.base }]}>
        <BalanceCard
          amount={totalOutstanding}
          label="Total Outstanding"
          subtitle={`${activeLoansCount} active loan${activeLoansCount !== 1 ? 's' : ''}`}
          style={{ marginBottom: tokens.spacing.base }}
        />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { 
        backgroundColor: colors.surface,
        paddingHorizontal: tokens.spacing.base,
      }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { borderRadius: tokens.radius.sm },
            filter === 'all' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[
            styles.filterText,
            { color: filter === 'all' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { borderRadius: tokens.radius.sm },
            filter === 'active' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setFilter('active')}
        >
          <Text style={[
            styles.filterText,
            { color: filter === 'active' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { borderRadius: tokens.radius.sm },
            filter === 'approved' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[
            styles.filterText,
            { color: filter === 'approved' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Approved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { borderRadius: tokens.radius.sm },
            filter === 'completed' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[
            styles.filterText,
            { color: filter === 'completed' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loans List */}
      <View style={[styles.listSection, { paddingHorizontal: tokens.spacing.base }]}>
        {filteredLoans.length > 0 ? (
          filteredLoans.map((loan) => (
            <View key={loan.id}>
              {renderLoanItem({ item: loan })}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileText color={colors.textTertiary} size={64} />
            <Text style={[styles.emptyTitle, {
              color: colors.textPrimary,
              fontSize: tokens.typography.h2.fontSize,
            }]}>
              No Loans Found
            </Text>
            <Text style={[styles.emptyText, {
              color: colors.textSecondary,
              fontSize: tokens.typography.body.fontSize,
            }]}>
              {filter === 'all' 
                ? "You don't have any loans yet."
                : `You don't have any ${filter} loans.`}
            </Text>
          </View>
        )}
      </View>

      {/* Apply for Loan Button */}
      <View style={[styles.actionSection, { paddingHorizontal: tokens.spacing.base }]}>
        <PrimaryButton
          title="Apply for New Loan"
          onPress={() => navigation.navigate('LoanApplicationStart')}
          variant="primary"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summarySection: {
    paddingTop: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listSection: {
    paddingTop: 8,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  actionSection: {
    paddingVertical: 24,
  },
});

export default LoansListScreen;
