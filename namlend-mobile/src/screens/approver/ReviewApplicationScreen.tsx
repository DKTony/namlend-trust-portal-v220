/**
 * Review Application Screen with Approve/Reject Actions
 * Version: v2.7.0 - Neo-Fintech Design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CheckCircle, XCircle, User, DollarSign, Briefcase, FileText, ChevronLeft, Calendar } from 'lucide-react-native';
import { useApprovalQueue, useApproveRequest, useRejectRequest } from '../../hooks/useApprovals';
import { formatNAD, formatPercentage } from '../../utils/currency';
import { useTheme } from '../../theme';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';

const ReviewApplicationScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { requestId } = route.params as { requestId: string };
  const { colors } = useTheme();

  const { data: queue } = useApprovalQueue();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const application = queue?.find(req => req.id === requestId);

  const handleApprove = () => {
    Alert.alert(
      'Approve Application',
      'Are you sure you want to approve this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            const result = await approveRequest.mutateAsync({
              requestId,
              notes: notes || undefined,
            });
            setIsProcessing(false);

            if (result.success) {
              Alert.alert(
                'Success',
                'Application approved successfully',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to approve application');
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    if (!notes || notes.trim().length === 0) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    Alert.alert(
      'Reject Application',
      'Are you sure you want to reject this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            const result = await rejectRequest.mutateAsync({
              requestId,
              notes,
            });
            setIsProcessing(false);

            if (result.success) {
              Alert.alert(
                'Success',
                'Application rejected',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to reject application');
            }
          },
        },
      ]
    );
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

  if (!application) {
    return (
      <View className="flex-1 bg-zinc-950 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const loanData = application.request_data;
  const profile = application.profile;
  const priorityStyle = getPriorityStyle(application.priority);

  return (
    <View className="flex-1 bg-zinc-950">
      {/* Header */}
      <View className="px-4 pt-16 pb-4 bg-zinc-900 border-b border-zinc-800 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full bg-zinc-800 border border-zinc-700">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-sans-bold tracking-tight">
          Review Application
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Application Header Card */}
        <NeoCard className="mb-6 bg-zinc-900 border-zinc-800 p-5">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-zinc-500 text-xs font-sans-medium uppercase tracking-wider mb-1">Request Type</Text>
              <Text className="text-white text-xl font-sans-bold uppercase tracking-tight">
                {application.request_type.replace('_', ' ')}
              </Text>
            </View>
            <View className={`px-3 py-1 rounded-full border ${priorityStyle.bg} ${priorityStyle.border}`}>
              <Text className={`text-[10px] font-sans-bold uppercase tracking-wide ${priorityStyle.text}`}>
                {application.priority}
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center">
            <Calendar size={14} color="#71717a" className="mr-2" />
            <Text className="text-zinc-500 text-xs font-sans">
              Submitted: {new Date(application.created_at).toLocaleString('en-NA')}
            </Text>
          </View>
        </NeoCard>

        {/* Loan Details */}
        {loanData && (
          <View className="mb-6">
            <Text className="text-zinc-500 text-xs font-sans-medium uppercase mb-3 ml-1 tracking-wider">Loan Details</Text>
            <NeoCard className="bg-zinc-900 border-zinc-800 p-5">
              <View className="border-b border-zinc-800 pb-4 mb-4">
                <Text className="text-zinc-400 text-sm mb-1 font-sans">Requested Amount</Text>
                <Text className="text-blue-400 text-3xl font-sans-bold tracking-tighter">
                  {formatNAD(loanData.amount || 0)}
                </Text>
              </View>
              
              <View className="space-y-3">
                <DetailRow label="Term" value={`${loanData.term || loanData.term_months || 0} months`} />
                <DetailRow 
                  label="Interest Rate" 
                  value={formatPercentage(loanData.interest_rate || loanData.interestRate || 0)} 
                />
                <DetailRow 
                  label="Monthly Payment" 
                  value={formatNAD(loanData.monthly_payment || loanData.monthlyPayment || 0)} 
                />
                <DetailRow 
                  label="Total Repayment" 
                  value={formatNAD(loanData.total_repayment || loanData.totalRepayment || 0)} 
                />
                {(loanData.purpose || loanData.loanPurpose) && (
                  <DetailRow 
                    label="Purpose" 
                    value={loanData.purpose || loanData.loanPurpose || ''} 
                  />
                )}
              </View>
            </NeoCard>
          </View>
        )}

        {/* Applicant Information */}
        <View className="mb-6">
          <Text className="text-zinc-500 text-xs font-sans-medium uppercase mb-3 ml-1 tracking-wider">Applicant Profile</Text>
          <NeoCard className="bg-zinc-900 border-zinc-800 p-5">
            <View className="space-y-4">
              <DetailRow 
                icon={<User color="#71717a" size={18} />}
                label="Name" 
                value={profile ? `${profile.first_name} ${profile.last_name}` : 'N/A'} 
              />
              <DetailRow 
                icon={<FileText color="#71717a" size={18} />}
                label="Email" 
                value={application.user?.email || 'N/A'} 
              />
              {profile?.phone_number && (
                <DetailRow 
                  icon={<FileText color="#71717a" size={18} />}
                  label="Phone" 
                  value={profile.phone_number} 
                />
              )}
              {profile?.employment_status && (
                <DetailRow 
                  icon={<Briefcase color="#71717a" size={18} />}
                  label="Employment" 
                  value={profile.employment_status.replace(/_/g, ' ')} 
                  valueClassName="capitalize"
                />
              )}
              {profile?.monthly_income && (
                <DetailRow 
                  icon={<DollarSign color="#71717a" size={18} />}
                  label="Monthly Income" 
                  value={formatNAD(profile.monthly_income)} 
                />
              )}
              {profile?.credit_score && (
                <DetailRow 
                  label="Credit Score" 
                  value={`${profile.credit_score}`}
                  subValue={profile.risk_category || 'Standard'}
                />
              )}
            </View>
          </NeoCard>
        </View>

        {/* Review Notes */}
        <View className="mb-6">
          <Text className="text-zinc-500 text-xs font-sans-medium uppercase mb-3 ml-1 tracking-wider">Review Notes</Text>
          <TextInput
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-zinc-100 text-base font-sans min-h-[120px]"
            placeholder="Add notes or reason for decision..."
            placeholderTextColor="#52525b"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-6 pb-8">
        {application.status === 'pending' || application.status === 'under_review' ? (
          <View className="flex-row gap-4">
            <View className="flex-1">
              <NeoButton
                title="Reject"
                onPress={handleReject}
                variant="danger"
                size="lg"
                loading={isProcessing}
                icon={<XCircle color="#f87171" size={20} />}
              />
            </View>

            <View className="flex-1">
              <NeoButton
                title="Approve"
                onPress={handleApprove}
                variant="success"
                size="lg"
                loading={isProcessing}
                icon={<CheckCircle color="#34d399" size={20} />}
                className="bg-emerald-600/20 border-emerald-500"
                textClassName="text-emerald-400"
              />
            </View>
          </View>
        ) : (
          <View className="items-center py-2">
            <Text className="text-zinc-500 font-sans-medium italic">
              This application has been {application.status}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const DetailRow: React.FC<{ 
  icon?: React.ReactNode; 
  label: string; 
  value: string;
  subValue?: string;
  valueClassName?: string;
}> = ({ icon, label, value, subValue, valueClassName = '' }) => (
  <View className="flex-row justify-between items-center py-1">
    <View className="flex-row items-center gap-3 flex-1">
      {icon}
      <Text className="text-zinc-400 text-sm font-sans">{label}</Text>
    </View>
    <View className="items-end flex-1">
      <Text className={`text-zinc-100 text-sm font-sans-medium ${valueClassName}`}>{value}</Text>
      {subValue && (
        <Text className="text-zinc-500 text-xs font-sans">{subValue}</Text>
      )}
    </View>
  </View>
);

export default ReviewApplicationScreen;
