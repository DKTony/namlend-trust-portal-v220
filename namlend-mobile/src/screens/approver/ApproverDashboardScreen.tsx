/**
 * Approver Dashboard Screen
 * Version: v2.7.0 - Neo-Fintech Design
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClipboardList, Clock, CheckCircle, AlertTriangle, ChevronRight, Bell } from 'lucide-react-native';
import { useApprovalStats, useApprovalQueue } from '../../hooks/useApprovals';
import { useMyPendingStages } from '../../hooks/useApprovals';
import { useTheme } from '../../theme';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import { ApproverTabParamList, ApprovalsStackParamList } from '../../navigation/ApproverStack';

type ApproverDashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<ApproverTabParamList, 'DashboardTab'>,
  NativeStackNavigationProp<ApprovalsStackParamList>
>;

const ApproverDashboardScreen: React.FC = () => {
  const navigation = useNavigation<ApproverDashboardNavigationProp>();
  const { colors } = useTheme();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useApprovalStats();
  const { data: queue, isLoading: queueLoading, refetch: refetchQueue } = useApprovalQueue({ limit: 5 });
  const { data: pendingStages, refetch: refetchStages } = useMyPendingStages();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchQueue(), refetchStages()]);
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

  return (
    <View className="flex-1 bg-zinc-950">
      <AmbientGlow position="top" />
      
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="px-6 pt-16 pb-6 bg-zinc-900 border-b border-zinc-800 flex-row justify-between items-start">
          <View>
            <Text className="text-zinc-500 text-xs font-sans-medium tracking-wider uppercase mb-1">
              APPROVER PORTAL
            </Text>
            <Text className="text-white text-3xl font-sans-bold tracking-tight mb-1">
              Dashboard
            </Text>
            <Text className="text-zinc-400 text-sm font-sans">
              Review and process applications
            </Text>
          </View>
          <View className="bg-zinc-900 p-2.5 rounded-full border border-zinc-800 relative shadow-sm">
            <Bell size={20} color="#a1a1aa" />
            {(stats?.myAssigned || 0) > 0 && (
              <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900" />
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View className="flex-row px-6 py-6 gap-3">
          <NeoCard className="flex-1 bg-zinc-900 border-zinc-800 items-center py-5">
            <View className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center mb-3 border border-zinc-700/50">
              <Clock color="#f59e0b" size={20} />
            </View>
            <Text className="text-white text-2xl font-sans-bold tracking-tight">{stats?.pending || 0}</Text>
            <Text className="text-zinc-500 text-xs font-sans-medium uppercase tracking-wide">Pending</Text>
          </NeoCard>

          <NeoCard className="flex-1 bg-zinc-900 border-zinc-800 items-center py-5">
            <View className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center mb-3 border border-zinc-700/50">
              <ClipboardList color="#3b82f6" size={20} />
            </View>
            <Text className="text-white text-2xl font-sans-bold tracking-tight">{stats?.underReview || 0}</Text>
            <Text className="text-zinc-500 text-xs font-sans-medium uppercase tracking-wide">Reviewing</Text>
          </NeoCard>

          <NeoCard className="flex-1 bg-zinc-900 border-zinc-800 items-center py-5">
            <View className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center mb-3 border border-zinc-700/50">
              <AlertTriangle color="#ef4444" size={20} />
            </View>
            <Text className="text-white text-2xl font-sans-bold tracking-tight">{stats?.myAssigned || 0}</Text>
            <Text className="text-zinc-500 text-xs font-sans-medium uppercase tracking-wide">Assigned</Text>
          </NeoCard>
        </View>

        {/* My Pending Workflow Stages */}
        {pendingStages && pendingStages.length > 0 && (
          <View className="px-6 mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-sans-bold tracking-tight">My Pending Actions</Text>
              <View className="bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30">
                <Text className="text-red-400 text-xs font-sans-bold">{pendingStages.length}</Text>
              </View>
            </View>
            
            {pendingStages.slice(0, 3).map((stage) => (
              <TouchableOpacity
                key={stage.id}
                onPress={() => {
                  // Navigate to review screen
                }}
              >
                <NeoCard className="mb-3 bg-zinc-900 border-l-4 border-l-red-500 border-zinc-800 p-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-white text-base font-sans-bold flex-1 mr-2 tracking-tight">
                      {stage.stage_name}
                    </Text>
                    <View className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                      <Text className="text-red-400 text-[10px] font-sans-bold uppercase">ACTION REQUIRED</Text>
                    </View>
                  </View>
                  <Text className="text-zinc-400 text-sm mb-1 font-sans">Role: {stage.assigned_role}</Text>
                  <Text className="text-zinc-500 text-xs font-sans">
                    Assigned: {new Date(stage.created_at).toLocaleDateString('en-NA')}
                  </Text>
                </NeoCard>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Applications */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-sans-bold tracking-tight">Recent Applications</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ApprovalsTab', { screen: 'ApprovalQueue' })}>
              <Text className="text-blue-500 text-sm font-sans-medium">View All</Text>
            </TouchableOpacity>
          </View>

          {queueLoading ? (
            <ActivityIndicator color="#3b82f6" className="py-8" />
          ) : queue && queue.length > 0 ? (
            queue.map((request) => {
              const priorityStyles = getPriorityStyle(request.priority);
              return (
                <TouchableOpacity
                  key={request.id}
                  onPress={() => 
                    navigation.navigate('ApprovalsTab', {
                      screen: 'ReviewApplication',
                      params: { requestId: request.id },
                    })
                  }
                >
                  <NeoCard className="mb-3 bg-zinc-900 border-zinc-800 p-4">
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-zinc-100 text-sm font-sans-bold uppercase tracking-tight">
                        {request.request_type.replace('_', ' ')}
                      </Text>
                      <View className={`px-2 py-0.5 rounded border ${priorityStyles.bg} ${priorityStyles.border}`}>
                        <Text className={`text-[10px] font-sans-bold uppercase ${priorityStyles.text}`}>
                          {request.priority}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-white text-base font-sans-medium mb-1">
                      {request.user?.email || 'Unknown Applicant'}
                    </Text>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-zinc-500 text-xs font-sans">
                        {new Date(request.created_at).toLocaleDateString('en-NA')}
                      </Text>
                      <ChevronRight size={16} color="#52525b" />
                    </View>
                  </NeoCard>
                </TouchableOpacity>
              );
            })
          ) : (
            <View className="items-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
              <CheckCircle color="#10b981" size={48} className="mb-4 opacity-80" />
              <Text className="text-white text-lg font-sans-semibold mb-1">All Caught Up!</Text>
              <Text className="text-zinc-500 text-sm">No pending applications at the moment.</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="px-6">
          <Text className="text-white text-lg font-sans-bold tracking-tight mb-4">Quick Actions</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ApprovalsTab', { screen: 'ApprovalQueue' })}
          >
            <NeoCard className="bg-blue-600/10 border-blue-500/30 flex-row items-center p-4">
              <View className="bg-blue-600/20 p-3 rounded-full mr-4 border border-blue-500/20">
                <ClipboardList color="#3b82f6" size={24} />
              </View>
              <View className="flex-1">
                <Text className="text-blue-400 text-base font-sans-bold">View All Approvals</Text>
                <Text className="text-blue-300/60 text-xs font-sans">Access the full approval queue</Text>
              </View>
              <ChevronRight size={20} color="#3b82f6" />
            </NeoCard>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default ApproverDashboardScreen;

