/**
 * Approver Profile Screen
 * Version: v2.4.2
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { User, Mail, Shield, LogOut, Settings } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';

const ApproverProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const profile = user?.profile;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <User color="#ffffff" size={40} />
        </View>
        <Text style={styles.name}>
          {profile?.first_name} {profile?.last_name}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Shield color="#ffffff" size={16} />
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoCard}>
          <InfoRow
            icon={<Mail color="#6b7280" size={20} />}
            label="Email"
            value={user?.email || 'N/A'}
          />
          <InfoRow
            icon={<Shield color="#6b7280" size={20} />}
            label="Role"
            value={user?.role || 'N/A'}
          />
          {profile?.phone_number && (
            <InfoRow
              icon={<Mail color="#6b7280" size={20} />}
              label="Phone"
              value={profile.phone_number}
            />
          )}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Settings color="#6b7280" size={20} />
          <Text style={styles.settingText}>Notification Preferences</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Settings color="#6b7280" size={20} />
          <Text style={styles.settingText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>NamLend Mobile v2.4.2</Text>
        <Text style={styles.footerText}>© 2025 NamLend Trust</Text>
        <Text style={styles.footerText}>Approver Portal</Text>
      </View>
    </ScrollView>
  );
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
    backgroundColor: '#2563eb',
    padding: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
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
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingText: {
    fontSize: 16,
    color: '#1f2937',
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
});

export default ApproverProfileScreen;
