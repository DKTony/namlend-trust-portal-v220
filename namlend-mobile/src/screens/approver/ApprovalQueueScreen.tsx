/**
 * Approval Queue Screen
 * Version: v2.7.0 - Neo-Fintech Design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClipboardList, ChevronRight, Filter } from 'lucide-react-native';
import { useApprovalQueue } from '../../hooks/useApprovals';
import { ApprovalRequest } from '../../types';
import { formatNAD } from '../../utils/currency';
import { useTheme } from '../../theme';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import { ApprovalsStackParamList } from '../../navigation/ApproverStack';

type ApprovalQueueNavigationProp = NativeStackNavigationProp<ApprovalsStackParamList, 'ApprovalQueue'>;

const ApprovalQueueScreen: React.FC = () => {
  const navigation = useNavigation<ApprovalQueueNavigationProp>();
  const { colors } = useTheme();
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

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
      case 'high':
        return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
      case 'normal':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
      default:
        return { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'rejected':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
      case 'under_review':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
      default:
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    }
  };

  const renderApplicationItem = ({ item }: { item: ApprovalRequest }) => {
    const loanAmount = item.request_data?.amount || 0;
    const priorityStyle = getPriorityStyle(item.priority);
    const statusStyle = getStatusStyle(item.status);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ReviewApplication', { requestId: item.id })}
      >
        <NeoCard className="mb-3 bg-zinc-900 border-zinc-800 p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View>
              <Text className="text-zinc-100 text-sm font-sans-bold uppercase tracking-tight">
                {item.request_type.replace('_', ' ')}
              </Text>
              {loanAmount > 0 && (
                <Text className="text-blue-400 text-lg font-sans-bold mt-1 tracking-tight">
                  {formatNAD(loanAmount)}
                </Text>
              )}
            </View>
            <ChevronRight color="#52525b" size={20} />
          </View>

          <View className="mb-4">
            <Text className="text-white text-base font-sans-medium mb-0.5">
              {item.user?.email || 'Unknown'}
            </Text>
            {item.profile && (
              <Text className="text-zinc-500 text-xs font-sans">
                {item.profile.first_name} {item.profile.last_name}
              </Text>
            )}
          </View>

          <View className="flex-row items-center justify-between border-t border-zinc-800 pt-3">
            <View className="flex-row gap-2">
              <View className={`px-2 py-0.5 rounded border ${priorityStyle.bg} ${priorityStyle.border}`}>
                <Text className={`text-[10px] font-sans-bold uppercase ${priorityStyle.text}`}>
                  {item.priority}
                </Text>
              </View>
              <View className={`px-2 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.border}`}>
                <Text className={`text-[10px] font-sans-bold uppercase ${statusStyle.text}`}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Text className="text-zinc-600 text-[10px] font-sans">
              {new Date(item.created_at).toLocaleDateString('en-NA')}
            </Text>
          </View>
        </NeoCard>
      </TouchableOpacity>
    );
  };

  const FilterTab = ({ label, value }: { label: string, value: string }) => (
    <TouchableOpacity
      onPress={() => setStatusFilter(value)}
      className={`flex-1 py-2 rounded-full border items-center ${
        statusFilter === value 
          ? 'bg-blue-600 border-blue-500' 
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <Text className={`text-xs font-sans-medium ${
        statusFilter === value ? 'text-white' : 'text-zinc-400'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const PriorityChip = ({ label, value }: { label: string, value: string | undefined }) => (
    <TouchableOpacity
      onPress={() => setPriorityFilter(value)}
      className={`px-3 py-1.5 rounded-full border mr-2 ${
        priorityFilter === value 
          ? 'bg-zinc-800 border-zinc-600' 
          : 'bg-transparent border-zinc-800'
      }`}
    >
      <Text className={`text-[10px] font-sans-bold uppercase ${
        priorityFilter === value ? 'text-white' : 'text-zinc-500'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-zinc-950">
      <AmbientGlow position="top" />
      
      {/* Header */}
      <View className="px-6 pt-16 pb-4 bg-zinc-900 border-b border-zinc-800">
        <Text className="text-white text-2xl font-sans-bold tracking-tight mb-4">
          Approval Queue
        </Text>
        
        {/* Status Filters */}
        <View className="flex-row gap-2 mb-4">
          <FilterTab label="Pending" value="pending" />
          <FilterTab label="In Review" value="under_review" />
          <FilterTab label="Approved" value="approved" />
        </View>

        {/* Priority Filters */}
        <View className="flex-row items-center pt-3 border-t border-zinc-800">
          <Filter size={14} color="#71717a" className="mr-3" />
          <PriorityChip label="All" value={undefined} />
          <PriorityChip label="Urgent" value="urgent" />
          <PriorityChip label="High" value="high" />
        </View>
      </View>

      {/* Applications List */}
      <FlatList
        data={queue || []}
        renderItem={renderApplicationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <View className="items-center py-16 opacity-50">
            <ClipboardList color="#71717a" size={64} />
            <Text className="text-white text-lg font-sans-semibold mt-4 mb-2">
              No Applications
            </Text>
            <Text className="text-zinc-500 text-sm text-center px-8">
              No {statusFilter.replace('_', ' ')} applications found with current filters.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default ApprovalQueueScreen;

