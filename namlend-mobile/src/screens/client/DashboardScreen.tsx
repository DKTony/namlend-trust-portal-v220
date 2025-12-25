/**
 * Client Dashboard Screen
 * Version: v2.7.0 - Neo-Fintech Redesign
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Percent,
  Bell,
  Plus,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useMyLoans, useLoanStats, useMyApplications } from '../../hooks/useLoans';
import { formatNAD } from '../../utils/currency';
import { useTheme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { NeoBalanceCard } from '../../components/neo/NeoBalanceCard';
import { NeoCurrencyCard } from '../../components/neo/NeoCurrencyCard';
import { NeoTransactionItem } from '../../components/neo/NeoTransactionItem';
import { NeoButton } from '../../components/neo/NeoButton';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import { NeoCard } from '../../components/neo/NeoCard';

const DashboardScreen: React.FC = ({ navigation }: any) => {
  const { colors, mode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { data: loans, isLoading: loansLoading, refetch: refetchLoans } = useMyLoans();
  const { data: applications, isLoading: appsLoading, refetch: refetchApps } = useMyApplications();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useLoanStats();

  const [refreshing, setRefreshing] = React.useState(false);
  const [activeCard, setActiveCard] = React.useState(0);

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 48; // padding 24 * 2
  const cardSpacing = 16;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchLoans(), refetchApps(), refetchStats()]);
    setRefreshing(false);
  };

  const isLoading = loansLoading || appsLoading || statsLoading;

  // Calculate available credit (example: N$50,000 - total borrowed)
  const availableCredit = 50000 - (stats?.totalBorrowed || 0);

  const balanceCards = React.useMemo(
    () => [
      {
        label: 'AVAILABLE CREDIT',
        subtitle: 'Your borrowing power',
        amount: Math.max(availableCredit, 0),
      },
      {
        label: 'OUTSTANDING BALANCE',
        subtitle: 'Total remaining',
        amount: stats?.totalOutstanding || 0,
      },
      {
        label: 'TOTAL BORROWED',
        subtitle: 'All time',
        amount: stats?.totalBorrowed || 0,
      },
    ],
    [availableCredit, stats?.totalOutstanding, stats?.totalBorrowed],
  );

  const handleCardScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (cardWidth + cardSpacing));
    const clampedIndex = Math.min(Math.max(index, 0), balanceCards.length - 1);
    setActiveCard(clampedIndex);
  };

  const nextPaymentDate = stats?.nextPaymentDate
    ? new Date(stats.nextPaymentDate).toLocaleDateString('en-NA', {
        month: 'short',
        day: 'numeric',
      })
    : 'No upcoming payments';

  const recentApplications = applications?.slice(0, 3) || [];
  const activeLoans = loans?.filter((loan) => loan.status === 'active') || [];
  const recentActiveLoans = activeLoans.slice(0, 3);

  const showEmptyState =
    !isLoading && recentApplications.length === 0 && recentActiveLoans.length === 0;

  const displayName = user?.profile
    ? `${user.profile.first_name} ${user.profile.last_name}`.trim()
    : user?.email?.split('@')[0] || 'Client';

  // Theme-derived styles
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-500';
  const iconBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const iconColor = mode === 'dark' ? '#a1a1aa' : '#71717a';

  return (
    <View className={`flex-1 ${mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-16 pb-6 flex-row justify-between items-center">
          <View>
            <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
              WELCOME BACK
            </Text>
            <Text className={`${textColor} text-2xl font-sans-bold tracking-tight`}>
              {displayName}
            </Text>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={toggleTheme}
              className={`${iconBg} border rounded-full p-2.5 shadow-sm`}
            >
              {mode === 'dark' ? (
                <Sun size={20} color={iconColor} />
              ) : (
                <Moon size={20} color={iconColor} />
              )}
            </TouchableOpacity>
            
            <View className={`${iconBg} border rounded-full p-2.5 relative shadow-sm`}>
              <Bell size={20} color={iconColor} />
              <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900" />
            </View>
          </View>
        </View>

        {/* Balance Cards Carousel */}
        <View className="mb-8">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 24 }}
            onMomentumScrollEnd={handleCardScroll}
            snapToInterval={cardWidth + 16} // Using 16 as gap
            disableIntervalMomentum
            scrollEventThrottle={16}
          >
            {balanceCards.map((card, index) => (
              <View
                key={card.label}
                style={{
                  width: cardWidth,
                  marginRight: index === balanceCards.length - 1 ? 0 : 16,
                }}
              >
                <NeoBalanceCard
                  amount={card.amount}
                  label={card.label}
                  subtitle={card.subtitle}
                />
              </View>
            ))}
          </ScrollView>
          
          {/* Pagination Dots */}
          <View className="flex-row justify-center mt-4 space-x-2">
            {balanceCards.map((_, index) => (
              <View
                key={`dot-${index}`}
                className={`h-1.5 rounded-full ${
                  index === activeCard ? 'w-4 bg-blue-600' : 'w-1.5 bg-zinc-300'
                }`}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions / Stats */}
        <View className="mb-8">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 24, paddingRight: 8 }}
          >
            <NeoCurrencyCard
              icon={DollarSign}
              label="TOTAL BORROWED"
              primaryValue={formatNAD(stats?.totalBorrowed || 0)}
              className="mr-4"
              variant="glass"
            />
            <NeoCurrencyCard
              icon={TrendingUp}
              label="OUTSTANDING"
              primaryValue={formatNAD(stats?.totalOutstanding || 0)}
              className="mr-4"
              variant="glass"
            />
            <NeoCurrencyCard
              icon={Percent}
              label="CURRENT APR"
              primaryValue="≤ 32%"
              secondaryValue="Compliant"
              className="mr-4"
              variant="glass"
            />
            <NeoCurrencyCard
              icon={Calendar}
              label="NEXT PAYMENT"
              primaryValue={stats?.activeLoans ? `${stats.activeLoans} active` : 'No active loans'}
              secondaryValue={nextPaymentDate}
              variant="glass"
            />
          </ScrollView>
        </View>

        {/* Action Button */}
        <View className="px-6 mb-8">
          <NeoButton
            title="Apply for New Loan"
            onPress={() => navigation.navigate('LoansTab', { screen: 'LoanApplicationStart' })}
            variant="primary"
            size="lg"
            icon={<Plus size={20} color="white" />}
            className="shadow-lg shadow-blue-900/20"
          />
        </View>

        {/* Activity Section */}
        <View className="px-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`${textColor} text-lg font-sans-bold tracking-tight`}>
              Recent Activity
            </Text>
            <Text className={`${subTextColor} text-xs font-sans tracking-wide`}>
              LAST 30 DAYS
            </Text>
          </View>

          <NeoCard variant="glass" className="p-2">
            {isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#3b82f6" />
              </View>
            ) : showEmptyState ? (
              <View className="py-8 items-center justify-center">
                <FileText color={mode === 'dark' ? "#3f3f46" : "#cbd5e1"} size={48} />
                <Text className={`${mode === 'dark' ? 'text-zinc-300' : 'text-zinc-600'} text-base font-sans-medium mt-4 mb-2`}>
                  No activity yet
                </Text>
                <Text className={`${subTextColor} text-sm text-center px-8`}>
                  Your recent loan applications and payments will appear here.
                </Text>
              </View>
            ) : (
              <>
                {recentApplications.map((app) => (
                  <NeoTransactionItem
                    key={`application-${app.id}`}
                    title="Loan Application"
                    subtitle={`Submitted ${new Date(app.created_at).toLocaleDateString('en-NA')}`}
                    amount={app.request_data?.amount || 0}
                    type="expense"
                    icon={FileText}
                  />
                ))}

                {recentActiveLoans.map((loan) => (
                  <NeoTransactionItem
                    key={`loan-${loan.id}`}
                    title={`Loan • ${loan.term_months} months`}
                    subtitle={`Monthly: ${formatNAD(loan.monthly_payment)}`}
                    amount={loan.amount}
                    type="income"
                    icon={DollarSign}
                  />
                ))}
              </>
            )}
          </NeoCard>
        </View>
      </ScrollView>
    </View>
  );
};

export default DashboardScreen;

