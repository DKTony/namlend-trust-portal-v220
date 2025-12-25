/**
 * Client Stack Navigator with Bottom Tabs
 * Version: v2.7.0 - Theme system integration
 */

import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Home, FileText, CreditCard, Upload, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

// Screens
import DashboardScreen from '../screens/client/DashboardScreen';
import LoansListScreen from '../screens/client/LoansListScreen';
import LoanDetailsScreen from '../screens/client/LoanDetailsScreen';
import LoanApplicationStartScreen from '../screens/client/LoanApplicationStartScreen';
import LoanApplicationFormScreen from '../screens/client/LoanApplicationFormScreen';
import PaymentScreen from '../screens/client/PaymentScreenEnhanced';
import DocumentUploadScreen from '../screens/client/DocumentUploadScreenEnhanced';
import ProfileScreen from '../screens/client/ProfileScreen';
import ProfileEditScreen from '../screens/client/ProfileEditScreen';
import LoanCalculatorScreen from '../screens/client/LoanCalculatorScreen';

export type ClientStackParamList = {
  Dashboard: undefined;
  LoansList: undefined;
  LoanDetails: { loanId: string };
  LoanApplicationStart: undefined;
  LoanApplicationForm: { amount?: number } | undefined;
  Payment: { loanId: string };
  DocumentUpload: undefined;
  Profile: undefined;
  ProfileEdit: undefined;
  LoanCalculator: undefined;
};

export type ClientTabParamList = {
  DashboardTab: undefined;
  LoansTab: undefined;
  DocumentsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createNativeStackNavigator<ClientStackParamList>();

// Custom Tab Bar Icon with Active Indicator
const CustomTabBarIcon = ({ focused, color, size, icon: Icon }: { focused: boolean; color: string; size: number; icon: any }) => {
  return (
    <View style={styles.iconContainer}>
      <Icon 
        color={color} 
        size={size} 
        strokeWidth={focused ? 2.5 : 2}
        style={focused ? styles.activeIconGlow : undefined} 
      />
      {focused && (
        <View style={styles.activeIndicator} />
      )}
    </View>
  );
};

// Loans Stack (for nested navigation)
const LoansStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="LoansList" 
        component={LoansListScreen}
        options={{ title: 'My Loans', headerShown: false }}
      />
      <Stack.Screen 
        name="LoanDetails" 
        component={LoanDetailsScreen}
        options={{ title: 'Loan Details', headerShown: false }}
      />
      <Stack.Screen 
        name="LoanApplicationStart" 
        component={LoanApplicationStartScreen}
        options={{ title: 'Apply for Loan', headerShown: false }}
      />
      <Stack.Screen 
        name="LoanApplicationForm" 
        component={LoanApplicationFormScreen}
        options={{ title: 'Loan Application', headerShown: false }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{ title: 'Make Payment', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Profile Stack (for nested navigation)
const ProfileStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile', headerShown: false }}
      />
      <Stack.Screen 
        name="ProfileEdit" 
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile', headerShown: false }}
      />
      <Stack.Screen 
        name="LoanCalculator" 
        component={LoanCalculatorScreen}
        options={{ title: 'Loan Calculator', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const ClientStack: React.FC = () => {
  const { colors, mode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6', // blue-500
        tabBarInactiveTintColor: mode === 'dark' ? '#71717a' : '#94a3b8', // zinc-500 : slate-400
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              tint={mode === 'dark' ? "dark" : "light"}
              intensity={80}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: mode === 'dark' ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]} />
          )
        ),
        headerStyle: { 
          backgroundColor: mode === 'dark' ? '#09090b' : '#ffffff', 
          borderBottomColor: mode === 'dark' ? '#27272a' : '#e2e8f0', 
          borderBottomWidth: 1 
        },
        headerTintColor: mode === 'dark' ? '#ffffff' : '#0f172a',
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: (props) => <CustomTabBarIcon {...props} icon={Home} />,
        }}
      />
      <Tab.Screen
        name="LoansTab"
        component={LoansStack}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'LoansList';
          // Hide tab bar on these screens
          const hideOnScreens = ['LoanApplicationStart', 'LoanApplicationForm', 'LoanDetails', 'Payment'];
          if (hideOnScreens.includes(routeName)) {
            return {
              tabBarStyle: { display: 'none' },
              title: 'Loans',
              headerShown: false,
              tabBarIcon: (props) => <CustomTabBarIcon {...props} icon={FileText} />,
            };
          }
          return {
            title: 'Loans',
            headerShown: false,
            tabBarIcon: (props) => <CustomTabBarIcon {...props} icon={FileText} />,
          };
        }}
      />
      <Tab.Screen
        name="DocumentsTab"
        component={DocumentUploadScreen}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: 'Documents',
          headerShown: false,
          tabBarIcon: (props) => <CustomTabBarIcon {...props} icon={Upload} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Profile';
          // Hide tab bar on these screens
          const hideOnScreens = ['ProfileEdit', 'LoanCalculator'];
          if (hideOnScreens.includes(routeName)) {
            return {
              tabBarStyle: { display: 'none' },
              title: 'Profile',
              headerShown: false,
              tabBarIcon: (props) => <CustomTabBarIcon {...props} icon={User} />,
            };
          }
          return {
            title: 'Profile',
            headerShown: false,
            tabBarIcon: (props) => <CustomTabBarIcon {...props} icon={User} />,
          };
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    height: 65,
    borderRadius: 35,
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    overflow: 'hidden', // Ensures BlurView clips to borderRadius on iOS
    backgroundColor: 'transparent',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    top: Platform.OS === 'ios' ? 10 : 0, // Visual center adjustment for floating bar
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
    marginTop: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  activeIconGlow: {
    // Optional: Add specific style if needed, though color prop handles most of it
  }
});

export default ClientStack;
