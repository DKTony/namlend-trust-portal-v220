/**
 * Loans List Screen
 * Version: v2.7.1 - Neo-Fintech Design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileText, DollarSign, Plus, Filter } from 'lucide-react-native';
import { useMyLoans } from '../../hooks/useLoans';
import { formatNAD } from '../../utils/currency';
import { Loan } from '../../types';
import { useTheme } from '../../theme';
import { NeoBalanceCard } from '../../components/neo/NeoBalanceCard';
import { NeoTransactionItem } from '../../components/neo/NeoTransactionItem';
import { NeoButton } from '../../components/neo/NeoButton';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import type { ClientStackParamList } from '../../navigation/ClientStack';

const LoansListScreen: React.FC = () => {
  const { colors, mode } = useTheme();
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

  // Theme styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-500';
  const activeFilterBg = 'bg-blue-600 border-blue-500';
  const inactiveFilterBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const activeFilterText = 'text-white';
  const inactiveFilterText = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-600';

  const renderLoanItem = (item: Loan) => {
    return (
      <NeoTransactionItem
        key={item.id}
        title={`${formatNAD(item.amount)} Loan`}
        subtitle={`${item.term_months} months • ${formatNAD(item.monthly_payment)}/mo • ${item.status}`}
        amount={item.total_repayment || item.amount}
        type={item.status === 'completed' ? 'income' : 'expense'}
        icon={DollarSign}
        onPress={() => navigation.navigate('LoanDetails', { loanId: item.id })}
        className="mb-2"
      />
    );
  };

  const FilterTab = ({ label, value }: { label: string, value: typeof filter }) => (
    <TouchableOpacity
      onPress={() => setFilter(value)}
      className={`px-4 py-2 rounded-full border mr-2 ${
        filter === value 
          ? activeFilterBg 
          : inactiveFilterBg
      }`}
    >
      <Text className={`text-xs font-sans-medium ${
        filter === value ? activeFilterText : inactiveFilterText
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className={`flex-1 ${containerBg}`}>
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-6 pt-16 pb-6">
          <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
            PORTFOLIO
          </Text>
          <Text className={`${textColor} text-3xl font-sans-bold tracking-tight mb-6`}>
            My Loans
          </Text>

          {/* Summary Card */}
          <NeoBalanceCard
            amount={totalOutstanding}
            label="TOTAL OUTSTANDING"
            subtitle={`${activeLoansCount} active loan${activeLoansCount !== 1 ? 's' : ''}`}
            className="mb-8"
          />

          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="mb-6"
          >
            <FilterTab label="All" value="all" />
            <FilterTab label="Active" value="active" />
            <FilterTab label="Approved" value="approved" />
            <FilterTab label="Completed" value="completed" />
          </ScrollView>

          {/* Loans List */}
          <View className="mb-24">
            {filteredLoans.length > 0 ? (
              filteredLoans.map((loan) => renderLoanItem(loan))
            ) : (
              <View className="items-center justify-center py-16 opacity-50">
                <FileText color={mode === 'dark' ? "#71717a" : "#94a3b8"} size={64} />
                <Text className={`${mode === 'dark' ? 'text-white' : 'text-zinc-900'} text-lg font-sans-semibold mt-4 mb-2`}>
                  No Loans Found
                </Text>
                <Text className={`${subTextColor} text-sm text-center px-8`}>
                  {filter === 'all' 
                    ? "You don't have any loans yet."
                    : `You don't have any ${filter} loans.`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button for New Loan */}
      <View className="absolute bottom-24 right-6 left-6">
        <NeoButton
          title="Apply for New Loan"
          onPress={() => navigation.navigate('LoanApplicationStart')}
          variant="primary"
          icon={<Plus size={20} color="white" />}
          className="shadow-lg shadow-blue-900/30"
          testID="apply-loan-button"
        />
      </View>
    </View>
  );
};

export default LoansListScreen;


