/**
 * Approver Dashboard Screen
 * Version: v2.4.2
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ClipboardList, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { useApprovalStats, useApprovalQueue } from '../../hooks/useApprovals';
import { useMyPendingStages } from '../../hooks/useApprovals';

const ApproverDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useApprovalStats();
  const { data: queue, isLoading: queueLoading, refetch: refetchQueue } = useApprovalQueue({ limit: 5 });
  const { data: pendingStages, refetch: refetchStages } = useMyPendingStages();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchQueue(), refetchStages()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Approvals Dashboard</Text>
        <Text style={styles.subtitle}>Review and process applications</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Clock color="#f59e0b" size={24} />
          <Text style={styles.statValue}>{stats?.pending || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <ClipboardList color="#2563eb" size={24} />
          <Text style={styles.statValue}>{stats?.underReview || 0}</Text>
          <Text style={styles.statLabel}>Under Review</Text>
        </View>

        <View style={styles.statCard}>
          <AlertTriangle color="#ef4444" size={24} />
          <Text style={styles.statValue}>{stats?.myAssigned || 0}</Text>
          <Text style={styles.statLabel}>Assigned to Me</Text>
        </View>
      </View>

      {/* My Pending Workflow Stages */}
      {pendingStages && pendingStages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pending Actions</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingStages.length}</Text>
            </View>
          </View>
          {pendingStages.slice(0, 3).map((stage) => (
            <TouchableOpacity
              key={stage.id}
              style={styles.stageCard}
              onPress={() => {
                // Navigate to review screen
                // Will need to get the approval request ID from workflow instance
              }}
            >
              <View style={styles.stageHeader}>
                <Text style={styles.stageName}>{stage.stage_name}</Text>
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>ACTION REQUIRED</Text>
                </View>
              </View>
              <Text style={styles.stageRole}>Role: {stage.assigned_role}</Text>
              <Text style={styles.stageDate}>
                Assigned: {new Date(stage.created_at).toLocaleDateString('en-NA')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Applications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Applications</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ApprovalsTab' as never)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {queueLoading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : queue && queue.length > 0 ? (
          queue.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.applicationCard}
              onPress={() => 
                navigation.navigate('ApprovalsTab' as never, {
                  screen: 'ReviewApplication',
                  params: { requestId: request.id },
                } as never)
              }
            >
              <View style={styles.applicationHeader}>
                <Text style={styles.applicationType}>
                  {request.request_type.replace('_', ' ').toUpperCase()}
                </Text>
                <View style={[styles.priorityBadge, getPriorityStyle(request.priority)]}>
                  <Text style={styles.priorityText}>{request.priority}</Text>
                </View>
              </View>
              <Text style={styles.applicantEmail}>{request.user?.email || 'Unknown'}</Text>
              <Text style={styles.applicationDate}>
                {new Date(request.created_at).toLocaleDateString('en-NA')}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <CheckCircle color="#10b981" size={48} />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>No pending applications at the moment.</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('ApprovalsTab' as never)}
        >
          <ClipboardList color="#2563eb" size={24} />
          <Text style={styles.quickActionText}>View All Approvals</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return { backgroundColor: '#fecaca' };
    case 'high':
      return { backgroundColor: '#fed7aa' };
    case 'normal':
      return { backgroundColor: '#fef3c7' };
    default:
      return { backgroundColor: '#e5e7eb' };
  }
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      {icon}
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  stageCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  urgentBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stageRole: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
  stageDate: {
    fontSize: 12,
    color: '#78716c',
  },
  applicationCard: {
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
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  applicationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
    textTransform: 'uppercase',
  },
  applicantEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});

export default ApproverDashboardScreen;
