/**
 * Client Profile Screen
 * Version: v2.7.0 - Perpetio-inspired redesign
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  User, Mail, Phone, Briefcase, DollarSign, LogOut, Edit,
  FileText, CreditCard, Calculator, Bell, HelpCircle
} from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { formatNAD } from '../../utils/currency';
import { Avatar, CurrencyCard, MenuItem, ThemeToggle } from '../../components/ui';
import { useTheme } from '../../theme';
import type { ClientStackParamList, ClientTabParamList } from '../../navigation/ClientStack';

const ProfileScreen: React.FC = () => {
  const { colors, tokens } = useTheme();
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile Header */}
      <View style={[styles.header, { paddingHorizontal: tokens.spacing.base }]}>
        <Avatar
          name={fullName}
          size={80}
          style={{ marginBottom: tokens.spacing.base }}
        />
        <Text style={[styles.name, {
          color: colors.textPrimary,
          fontSize: tokens.typography.h1.fontSize,
          fontWeight: tokens.typography.h1.fontWeight,
        }]}>
          {fullName}
        </Text>
        <Text style={[styles.email, {
          color: colors.textSecondary,
          fontSize: tokens.typography.caption.fontSize,
        }]}>
          {user?.email}
        </Text>
      </View>

      {/* Currency Info Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.currencySection, { paddingLeft: tokens.spacing.base }]}
        contentContainerStyle={{ paddingRight: tokens.spacing.base }}
      >
        {profile?.credit_score && (
          <CurrencyCard
            label="Credit Score"
            primaryValue={profile.credit_score.toString()}
            secondaryValue={profile.risk_category || 'Standard'}
            style={{ marginRight: tokens.spacing.base, width: 160 }}
          />
        )}
        {profile?.monthly_income && (
          <CurrencyCard
            icon={DollarSign}
            label="Monthly Income"
            primaryValue={formatNAD(profile.monthly_income)}
            style={{ marginRight: tokens.spacing.base, width: 160 }}
          />
        )}
        <CurrencyCard
          label="Status"
          primaryValue={profile?.verified ? 'Verified' : 'Pending'}
          secondaryValue={profile?.verified ? '✓ Active' : 'In Review'}
          style={{ marginRight: tokens.spacing.base, width: 160 }}
        />
      </ScrollView>

      {/* Theme Toggle */}
      <View style={[styles.themeSection, { 
        paddingHorizontal: tokens.spacing.base,
        marginTop: tokens.spacing.lg,
        marginBottom: tokens.spacing.base,
      }]}>
        <ThemeToggle />
      </View>

      {/* Menu Items */}
      <View style={[styles.menuSection, { marginTop: tokens.spacing.base }]}>
        <MenuItem
          icon={FileText}
          label="My Documents"
          subtitle="Upload and manage KYC documents"
          onPress={() => {
            // Switch to Documents tab
            tabNav.navigate('DocumentsTab');
          }}
        />
        <MenuItem
          icon={CreditCard}
          label="Payment History"
          subtitle="View all transactions"
          onPress={() => {
            // Switch to Loans tab (defaults to LoansList)
            tabNav.navigate('LoansTab');
          }}
        />
        <MenuItem
          icon={Calculator}
          label="Loan Calculator"
          subtitle="Calculate loan estimates"
          onPress={() => {
            stackNav.navigate('LoanCalculator');
          }}
        />
        <MenuItem
          icon={Bell}
          label="Notifications"
          subtitle="Manage notification preferences"
          badge="3"
          onPress={() => {
            // TODO: Implement notifications screen
            Alert.alert('Coming Soon', 'Notifications feature will be available soon.');
          }}
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
          onPress={() => {
            // TODO: Implement help screen
            Alert.alert('Help & Support', 'For assistance, please contact support@namlend.com');
          }}
        />
        <MenuItem
          icon={LogOut}
          label="Sign Out"
          subtitle="Log out of your account"
          onPress={handleSignOut}
          showChevron={false}
        />
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          NamLend Mobile v2.7.0
        </Text>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          © 2025 NamLend Trust
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  name: {
    marginBottom: 8,
  },
  email: {
    marginBottom: 24,
  },
  currencySection: {
    marginBottom: 24,
  },
  themeSection: {
    // Styles applied inline with theme
  },
  menuSection: {
    // Styles applied inline with theme
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});

export default ProfileScreen;
