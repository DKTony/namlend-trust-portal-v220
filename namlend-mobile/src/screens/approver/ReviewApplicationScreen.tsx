/**
 * Review Application Screen with Approve/Reject Actions
 * Version: v2.4.2
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CheckCircle, XCircle, User, DollarSign, Briefcase, FileText } from 'lucide-react-native';
import { useApprovalQueue, useApproveRequest, useRejectRequest } from '../../hooks/useApprovals';
import { formatNAD, formatPercentage } from '../../utils/currency';

const ReviewApplicationScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { requestId } = route.params as { requestId: string };

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

  if (!application) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const loanData = application.request_data;
  const profile = application.profile;

  return (
    <ScrollView style={styles.container}>
      {/* Application Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {application.request_type.replace('_', ' ').toUpperCase()}
        </Text>
        <View style={[styles.priorityBadge, getPriorityStyle(application.priority)]}>
          <Text style={styles.priorityText}>{application.priority.toUpperCase()}</Text>
        </View>
      </View>

      {/* Loan Details */}
      {loanData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Details</Text>
          <View style={styles.card}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Requested Amount</Text>
              <Text style={styles.amountValue}>{formatNAD(loanData.amount || 0)}</Text>
            </View>
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
        </View>
      )}

      {/* Applicant Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Applicant Information</Text>
        <View style={styles.card}>
          <DetailRow 
            icon={<User color="#6b7280" size={20} />}
            label="Name" 
            value={profile ? `${profile.first_name} ${profile.last_name}` : 'N/A'} 
          />
          <DetailRow 
            icon={<FileText color="#6b7280" size={20} />}
            label="Email" 
            value={application.user?.email || 'N/A'} 
          />
          {profile?.phone_number && (
            <DetailRow 
              icon={<FileText color="#6b7280" size={20} />}
              label="Phone" 
              value={profile.phone_number} 
            />
          )}
          {profile?.employment_status && (
            <DetailRow 
              icon={<Briefcase color="#6b7280" size={20} />}
              label="Employment" 
              value={profile.employment_status} 
            />
          )}
          {profile?.monthly_income && (
            <DetailRow 
              icon={<DollarSign color="#6b7280" size={20} />}
              label="Monthly Income" 
              value={formatNAD(profile.monthly_income)} 
            />
          )}
          {profile?.credit_score && (
            <DetailRow 
              label="Credit Score" 
              value={`${profile.credit_score} (${profile.risk_category || 'Standard'})`} 
            />
          )}
        </View>
      </View>

      {/* Application Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.card}>
          <DetailRow 
            label="Submitted" 
            value={new Date(application.created_at).toLocaleString('en-NA')} 
          />
          {application.reviewed_at && (
            <DetailRow 
              label="Reviewed" 
              value={new Date(application.reviewed_at).toLocaleString('en-NA')} 
            />
          )}
        </View>
      </View>

      {/* Review Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes or reason for decision..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Action Buttons */}
      {application.status === 'pending' || application.status === 'under_review' ? (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton, isProcessing && styles.buttonDisabled]}
            onPress={handleReject}
            disabled={isProcessing}
          >
            <XCircle color="#ffffff" size={20} />
            <Text style={styles.actionButtonText}>
              {isProcessing ? 'Processing...' : 'Reject'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton, isProcessing && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={isProcessing}
          >
            <CheckCircle color="#ffffff" size={20} />
            <Text style={styles.actionButtonText}>
              {isProcessing ? 'Processing...' : 'Approve'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.statusSection}>
          <Text style={styles.statusText}>
            This application has been {application.status}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const DetailRow: React.FC<{ 
  icon?: React.ReactNode; 
  label: string; 
  value: string 
}> = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      {icon}
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountRow: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
    flex: 1,
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#d1d5db',
    minHeight: 100,
  },
  actionSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusSection: {
    padding: 16,
    paddingBottom: 32,
  },
  statusText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ReviewApplicationScreen;
