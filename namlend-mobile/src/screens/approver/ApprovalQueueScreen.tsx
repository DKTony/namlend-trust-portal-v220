/**
 * Approval Queue Screen
 * Version: v2.4.2
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ClipboardList, ChevronRight, Filter } from 'lucide-react-native';
import { useApprovalQueue } from '../../hooks/useApprovals';
import { ApprovalRequest } from '../../types';
import { formatNAD } from '../../utils/currency';

const ApprovalQueueScreen: React.FC = () => {
  const navigation = useNavigation();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  
  const { data: queue, isLoading, refetch } = useApprovalQueue({
    status: statusFilter,
    priority: priorityFilter,
  });
  
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderApplicationItem = ({ item }: { item: ApprovalRequest }) => {
    const loanAmount = item.request_data?.amount || 0;
    
    return (
      <TouchableOpacity
        style={styles.applicationCard}
        onPress={() => navigation.navigate('ReviewApplication' as never, { requestId: item.id } as never)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.applicationType}>
              {item.request_type.replace('_', ' ').toUpperCase()}
            </Text>
            {loanAmount > 0 && (
              <Text style={styles.loanAmount}>{formatNAD(loanAmount)}</Text>
            )}
          </View>
          <ChevronRight color="#9ca3af" size={24} />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.applicantEmail}>{item.user?.email || 'Unknown'}</Text>
          {item.profile && (
            <Text style={styles.applicantName}>
              {item.profile.first_name} {item.profile.last_name}
            </Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.priorityBadge, getPriorityStyle(item.priority)]}>
            <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-NA')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'pending' && styles.filterTabActive]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[styles.filterText, statusFilter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'under_review' && styles.filterTabActive]}
          onPress={() => setStatusFilter('under_review')}
        >
          <Text style={[styles.filterText, statusFilter === 'under_review' && styles.filterTextActive]}>
            Under Review
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'approved' && styles.filterTabActive]}
          onPress={() => setStatusFilter('approved')}
        >
          <Text style={[styles.filterText, statusFilter === 'approved' && styles.filterTextActive]}>
            Approved
          </Text>
        </TouchableOpacity>
      </View>

      {/* Priority Filter */}
      <View style={styles.priorityFilterContainer}>
        <Text style={styles.priorityFilterLabel}>Priority:</Text>
        <TouchableOpacity
          style={[styles.priorityChip, !priorityFilter && styles.priorityChipActive]}
          onPress={() => setPriorityFilter(undefined)}
        >
          <Text style={[styles.priorityChipText, !priorityFilter && styles.priorityChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.priorityChip, priorityFilter === 'urgent' && styles.priorityChipActive]}
          onPress={() => setPriorityFilter('urgent')}
        >
          <Text style={[styles.priorityChipText, priorityFilter === 'urgent' && styles.priorityChipTextActive]}>
            Urgent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.priorityChip, priorityFilter === 'high' && styles.priorityChipActive]}
          onPress={() => setPriorityFilter('high')}
        >
          <Text style={[styles.priorityChipText, priorityFilter === 'high' && styles.priorityChipTextActive]}>
            High
          </Text>
        </TouchableOpacity>
      </View>

      {/* Applications List */}
      <FlatList
        data={queue || []}
        renderItem={renderApplicationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ClipboardList color="#9ca3af" size={64} />
            <Text style={styles.emptyTitle}>No Applications</Text>
            <Text style={styles.emptyText}>
              No {statusFilter} applications at the moment.
            </Text>
          </View>
        }
      />
    </View>
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

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'approved':
      return { backgroundColor: '#d1fae5' };
    case 'rejected':
      return { backgroundColor: '#fecaca' };
    case 'under_review':
      return { backgroundColor: '#dbeafe' };
    default:
      return { backgroundColor: '#fef3c7' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  priorityFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  priorityFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  priorityChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  priorityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  priorityChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  loanAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  cardBody: {
    marginBottom: 12,
  },
  applicantEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1f2937',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ApprovalQueueScreen;
