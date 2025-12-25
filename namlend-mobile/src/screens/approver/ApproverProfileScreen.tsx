/**
 * Approver Profile Screen
 * Version: v2.7.0 - Neo-Fintech Design
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { User, Mail, Shield, LogOut, Settings, Phone, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';

const ApproverProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();

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
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Approver';
  const initials = fullName.slice(0, 2).toUpperCase();

  const MenuItem = ({ icon: Icon, label, subtitle, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-4 border-b border-zinc-800"
    >
      <View className="w-10 h-10 rounded-full bg-zinc-900 items-center justify-center mr-4 border border-zinc-800 shadow-sm">
        <Icon size={20} color="#a1a1aa" />
      </View>
      <View className="flex-1">
        <Text className="text-zinc-100 text-base font-sans-medium mb-0.5 tracking-tight">
          {label}
        </Text>
        {subtitle && (
          <Text className="text-zinc-500 text-xs font-sans">
            {subtitle}
          </Text>
        )}
      </View>
      <ChevronRight size={16} color="#52525b" />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-zinc-950">
      <AmbientGlow position="top" />
      
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Header */}
        <View className="items-center pt-16 pb-8 bg-zinc-900 border-b border-zinc-800">
          <View className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 items-center justify-center mb-4 shadow-lg shadow-black/50">
            <Text className="text-3xl font-sans-bold text-zinc-400 tracking-tighter">
              {initials}
            </Text>
          </View>
          <Text className="text-white text-2xl font-sans-bold tracking-tight mb-1">
            {fullName}
          </Text>
          <Text className="text-zinc-500 text-sm font-sans mb-4">
            {user?.email}
          </Text>
          
          <View className="bg-blue-600/10 px-3 py-1 rounded-full border border-blue-600/20 flex-row items-center">
            <Shield size={12} color="#3b82f6" />
            <Text className="text-blue-400 text-xs font-sans-bold ml-1.5 uppercase tracking-wide">
              {user?.role?.toUpperCase()}
            </Text>
          </View>
        </View>

        <View className="p-6">
          {/* Account Information */}
          <View className="mb-8">
            <Text className="text-zinc-500 text-xs font-sans-medium uppercase mb-3 ml-1 tracking-wider">Account Information</Text>
            <NeoCard className="bg-zinc-900 border-zinc-800 p-5">
              <View className="space-y-4">
                <InfoRow
                  icon={<Mail color="#71717a" size={18} />}
                  label="Email"
                  value={user?.email || 'N/A'}
                />
                <InfoRow
                  icon={<Shield color="#71717a" size={18} />}
                  label="Role"
                  value={user?.role?.replace('_', ' ').toUpperCase() || 'N/A'}
                />
                {profile?.phone_number && (
                  <InfoRow
                    icon={<Phone color="#71717a" size={18} />}
                    label="Phone"
                    value={profile.phone_number}
                  />
                )}
              </View>
            </NeoCard>
          </View>

          {/* Settings Menu */}
          <View className="mb-8">
            <Text className="text-zinc-500 text-xs font-sans-medium uppercase mb-3 ml-1 tracking-wider">Settings</Text>
            <View>
              <MenuItem
                icon={Settings}
                label="Notification Preferences"
                subtitle="Manage alerts and updates"
                onPress={() => {}}
              />
              <MenuItem
                icon={Shield}
                label="Security"
                subtitle="Password and authentication"
                onPress={() => {}}
              />
            </View>
          </View>

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-center p-4 rounded-xl bg-red-500/10 border border-red-500/20 mt-4"
          >
            <LogOut color="#ef4444" size={20} />
            <Text className="text-red-400 font-sans-bold text-base ml-2">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="items-center pb-8">
          <Text className="text-zinc-700 text-xs font-sans">
            NamLend Mobile v2.7.0
          </Text>
          <Text className="text-zinc-800 text-[10px] font-sans mt-1">
            Approver Portal • © 2025
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View className="flex-row items-center py-2">
    <View className="flex-row items-center gap-3 w-32">
      {icon}
      <Text className="text-zinc-400 text-sm font-sans">{label}</Text>
    </View>
    <Text className="text-white text-sm font-sans-medium flex-1 text-right">{value}</Text>
  </View>
);

export default ApproverProfileScreen;

