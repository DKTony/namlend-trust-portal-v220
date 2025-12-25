/**
 * Client Profile Screen
 * Version: v2.7.0 - Neo-Fintech Design
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  User, Mail, Phone, Briefcase, DollarSign, LogOut, Edit,
  FileText, CreditCard, Calculator, Bell, HelpCircle, ChevronRight, Shield
} from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { formatNAD } from '../../utils/currency';
import { NeoCurrencyCard } from '../../components/neo/NeoCurrencyCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import { useTheme } from '../../theme';
import type { ClientStackParamList, ClientTabParamList } from '../../navigation/ClientStack';

const ProfileScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const stackNav = useNavigation<NativeStackNavigationProp<ClientStackParamList, 'Profile'>>();
  const tabNav = useNavigation<BottomTabNavigationProp<ClientTabParamList>>();
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
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Theme styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const headerBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const borderColor = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-500';
  const iconBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200';
  const menuItemText = mode === 'dark' ? 'text-zinc-100' : 'text-zinc-800';
  const iconColor = mode === 'dark' ? '#a1a1aa' : '#71717a';
  const chevronColor = mode === 'dark' ? '#52525b' : '#a1a1aa';

  const MenuItem = ({ icon: Icon, label, subtitle, onPress, showChevron = true, badge }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center py-4 border-b ${borderColor}`}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 border shadow-sm ${iconBg}`}>
        <Icon size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className={`${menuItemText} text-base font-sans-medium mb-0.5 tracking-tight`}>
          {label}
        </Text>
        <Text className={`${subTextColor} text-xs font-sans`}>
          {subtitle}
        </Text>
      </View>
      {badge && (
        <View className="bg-blue-600 rounded-full px-2 py-0.5 mr-2">
          <Text className="text-white text-[10px] font-sans-bold">{badge}</Text>
        </View>
      )}
      {showChevron && <ChevronRight size={16} color={chevronColor} />}
    </TouchableOpacity>
  );

  return (
    <View className={`flex-1 ${containerBg}`}>
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      <ScrollView className="flex-1">
        {/* Profile Header */}
        <View className={`items-center pt-16 pb-8 ${headerBg} border-b ${borderColor}`}>
          <View className={`w-24 h-24 rounded-full items-center justify-center mb-4 border-2 ${mode === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'} shadow-lg shadow-black/10`}>
            <Text className={`text-3xl font-sans-bold tracking-tighter ${mode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {initials}
            </Text>
          </View>
          <Text className={`${textColor} text-2xl font-sans-bold tracking-tight mb-1`}>
            {fullName}
          </Text>
          <Text className={`${subTextColor} text-sm font-sans mb-4`}>
            {user?.email}
          </Text>
          
          <View className={`px-3 py-1.5 rounded-full flex-row items-center ${
            profile?.verified 
              ? (mode === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200')
              : (mode === 'dark' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200')
          } border`}>
            <Shield size={12} color={profile?.verified ? (mode === 'dark' ? '#10b981' : '#059669') : (mode === 'dark' ? '#f59e0b' : '#d97706')} />
            <Text className={`ml-1.5 text-[10px] font-sans-bold uppercase tracking-wide ${
              profile?.verified 
                ? (mode === 'dark' ? 'text-emerald-500' : 'text-emerald-700')
                : (mode === 'dark' ? 'text-yellow-500' : 'text-yellow-700')
            }`}>
              {profile?.verified ? 'VERIFIED ACCOUNT' : 'VERIFICATION PENDING'}
            </Text>
          </View>
        </View>

        {/* Currency Info Cards */}
        <View className="py-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            {profile?.credit_score && (
              <NeoCurrencyCard
                label="CREDIT SCORE"
                primaryValue={profile.credit_score.toString()}
                secondaryValue={profile.risk_category || 'Standard'}
                className="mr-4"
                variant="glass"
              />
            )}
            {profile?.monthly_income && (
              <NeoCurrencyCard
                icon={DollarSign}
                label="MONTHLY INCOME"
                primaryValue={formatNAD(profile.monthly_income)}
                className="mr-4"
                variant="glass"
              />
            )}
            <NeoCurrencyCard
              label="MEMBER SINCE"
              primaryValue={new Date(user?.created_at || Date.now()).getFullYear().toString()}
              secondaryValue="Loyal Client"
              className="mr-4"
              variant="glass"
            />
          </ScrollView>
        </View>

        {/* Menu Items */}
        <View className="px-6 mb-12">
          <Text className={`${subTextColor} text-xs font-sans-medium mb-4 uppercase tracking-wider`}>
            Account Management
          </Text>
          
          <MenuItem
            icon={FileText}
            label="My Documents"
            subtitle="Upload and manage KYC documents"
            onPress={() => tabNav.navigate('DocumentsTab')}
          />
          <MenuItem
            icon={CreditCard}
            label="Payment History"
            subtitle="View all transactions"
            onPress={() => tabNav.navigate('LoansTab')}
          />
          <MenuItem
            icon={Calculator}
            label="Loan Calculator"
            subtitle="Calculate loan estimates"
            onPress={() => stackNav.navigate('LoanCalculator')}
          />
          <MenuItem
            icon={Bell}
            label="Notifications"
            subtitle="Manage notification preferences"
            badge="3"
            onPress={() => Alert.alert('Coming Soon', 'Notifications feature will be available soon.')}
          />
          <MenuItem
            icon={Edit}
            label="Edit Profile"
            subtitle="Update personal information"
            onPress={() => stackNav.navigate('ProfileEdit')}
          />
          <MenuItem
            icon={HelpCircle}
            label="Help & Support"
            subtitle="Get assistance"
            onPress={() => Alert.alert('Help & Support', 'Contact support@namlend.com')}
          />
          
          <TouchableOpacity
            onPress={handleSignOut}
            className={`flex-row items-center py-4 border-b ${borderColor} mt-4`}
          >
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 border ${mode === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
              <LogOut size={20} color={mode === 'dark' ? "#ef4444" : "#dc2626"} />
            </View>
            <View className="flex-1">
              <Text className={`${mode === 'dark' ? 'text-red-400' : 'text-red-600'} text-base font-sans-medium mb-0.5`}>
                Sign Out
              </Text>
              <Text className={`${subTextColor} text-xs font-sans`}>
                Log out of your account
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="items-center pb-24">
          <Text className={`${subTextColor} text-xs font-sans`}>
            NamLend Mobile v2.7.0
          </Text>
          <Text className={`${mode === 'dark' ? 'text-zinc-800' : 'text-zinc-300'} text-[10px] font-sans mt-1`}>
            © 2025 NamLend Trust
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;


