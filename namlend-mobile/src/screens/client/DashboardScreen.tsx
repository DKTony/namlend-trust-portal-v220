/**
 * Client Dashboard Screen
 * Version: v2.7.0 - Perpetio-inspired redesign
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import {
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Percent,
  Bell,
} from 'lucide-react-native';
import { useMyLoans, useLoanStats, useMyApplications } from '../../hooks/useLoans';
import { formatNAD } from '../../utils/currency';
import { BalanceCard, TransactionItem, CurrencyCard } from '../../components/ui';
import { useTheme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';

const DashboardScreen: React.FC = () => {
  const { colors, tokens } = useTheme();
  const { user } = useAuth();
  const { data: loans, isLoading: loansLoading, refetch: refetchLoans } = useMyLoans();
  const { data: applications, isLoading: appsLoading, refetch: refetchApps } = useMyApplications();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useLoanStats();

  const [refreshing, setRefreshing] = React.useState(false);
  const [activeCard, setActiveCard] = React.useState(0);

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - tokens.spacing.base * 2;
  const cardSpacing = tokens.spacing.base;

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
        label: 'Available Credit',
        subtitle: 'Your borrowing power',
        amount: Math.max(availableCredit, 0),
      },
      {
        label: 'Outstanding Balance',
        subtitle: 'Total remaining',
        amount: stats?.totalOutstanding || 0,
      },
      {
        label: 'Total Borrowed',
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
    : user?.email || 'NamLend Client';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: tokens.spacing.base,
            paddingTop: tokens.spacing['3xl'],
            paddingBottom: tokens.spacing.lg,
          },
        ]}
      >
        <View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: tokens.typography.caption.fontSize,
              lineHeight: tokens.typography.caption.lineHeight,
              marginBottom: tokens.spacing.xs,
            }}
          >
            Welcome back,
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.h1.fontSize,
              lineHeight: tokens.typography.h1.lineHeight,
              fontWeight: tokens.typography.h1.fontWeight,
            }}
          >
            {displayName}
          </Text>
        </View>
        <View style={[styles.statusPill, { borderColor: colors.divider }]}
        >
          <Bell color={colors.textSecondary} size={18} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: tokens.typography.caption.fontSize,
              lineHeight: tokens.typography.caption.lineHeight,
              marginLeft: 8,
            }}
          >
            Next payment: {nextPaymentDate}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: tokens.spacing.xl }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.base }}
          onMomentumScrollEnd={handleCardScroll}
          snapToInterval={cardWidth + cardSpacing}
          disableIntervalMomentum
          scrollEventThrottle={16}
        >
          {balanceCards.map((card, index) => (
            <View
              key={card.label}
              style={{
                width: cardWidth,
                marginRight:
                  index === balanceCards.length - 1 ? 0 : tokens.spacing.base,
              }}
            >
              <BalanceCard
                amount={card.amount}
                label={card.label}
                subtitle={card.subtitle}
              />
            </View>
          ))}
        </ScrollView>
        <View style={[styles.paginationDots, { marginTop: tokens.spacing.md }]}
        >
          {balanceCards.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={{
                width: index === activeCard ? 16 : 6,
                height: 6,
                borderRadius: 3,
                marginHorizontal: 4,
                backgroundColor:
                  index === activeCard ? colors.primary : colors.divider,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingLeft: tokens.spacing.base, marginBottom: tokens.spacing['2xl'] }}
        contentContainerStyle={{ paddingRight: tokens.spacing.base }}
      >
        <CurrencyCard
          icon={DollarSign}
          label="Total Borrowed"
          primaryValue={formatNAD(stats?.totalBorrowed || 0)}
          style={{ marginRight: tokens.spacing.base, width: 160 }}
        />
        <CurrencyCard
          icon={TrendingUp}
          label="Outstanding"
          primaryValue={formatNAD(stats?.totalOutstanding || 0)}
          style={{ marginRight: tokens.spacing.base, width: 160 }}
        />
        <CurrencyCard
          icon={Percent}
          label="APR"
          primaryValue="≤ 32%"
          secondaryValue="Compliant"
          style={{ marginRight: tokens.spacing.base, width: 160 }}
        />
        <CurrencyCard
          icon={Calendar}
          label="Payments Due"
          primaryValue={stats?.activeLoans ? `${stats.activeLoans} active` : '0 active'}
          secondaryValue={nextPaymentDate}
          style={{ width: 160 }}
        />
      </ScrollView>

      <View style={{ paddingHorizontal: tokens.spacing.base }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: tokens.spacing.md,
        }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: tokens.typography.h2.fontSize,
              lineHeight: tokens.typography.h2.lineHeight,
              fontWeight: tokens.typography.h2.fontWeight,
            }}
          >
            Activity
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: tokens.typography.caption.fontSize,
              lineHeight: tokens.typography.caption.lineHeight,
            }}
          >
            Last 30 days
          </Text>
        </View>

        {isLoading && (
          <View style={{ paddingVertical: tokens.spacing['2xl'], alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {recentApplications.map((app) => (
          <TransactionItem
            key={`application-${app.id}`}
            title="Loan Application"
            subtitle={`Submitted ${new Date(app.created_at).toLocaleDateString('en-NA')}`}
            amount={app.request_data?.amount || 0}
            type="expense"
            icon={FileText}
          />
        ))}

        {recentActiveLoans.map((loan) => (
          <TransactionItem
            key={`loan-${loan.id}`}
            title={`Loan • ${loan.term_months} months`}
            subtitle={`Monthly: ${formatNAD(loan.monthly_payment)}`}
            amount={loan.amount}
            type="income"
            icon={DollarSign}
          />
        ))}

        {showEmptyState && (
          <View style={styles.emptyState}>
            <FileText color={colors.textTertiary} size={64} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}
            >
              No activity yet
            </Text>
            <Text
              style={[styles.emptyText, { color: colors.textSecondary }]}
            >
              Apply for your first loan to see updates here.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DashboardScreen;
