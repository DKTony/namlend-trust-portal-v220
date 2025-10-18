/**
 * Client Stack Navigator with Bottom Tabs
 * Version: v2.4.2
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, FileText, CreditCard, Upload, User } from 'lucide-react-native';

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

// Loans Stack (for nested navigation)
const LoansStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="LoansList" 
        component={LoansListScreen}
        options={{ title: 'My Loans' }}
      />
      <Stack.Screen 
        name="LoanDetails" 
        component={LoanDetailsScreen}
        options={{ title: 'Loan Details' }}
      />
      <Stack.Screen 
        name="LoanApplicationStart" 
        component={LoanApplicationStartScreen}
        options={{ title: 'Apply for Loan' }}
      />
      <Stack.Screen 
        name="LoanApplicationForm" 
        component={LoanApplicationFormScreen}
        options={{ title: 'Loan Application' }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{ title: 'Make Payment' }}
      />
    </Stack.Navigator>
  );
};

// Profile Stack (for nested navigation)
const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="ProfileEdit" 
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen 
        name="LoanCalculator" 
        component={LoanCalculatorScreen}
        options={{ title: 'Loan Calculator' }}
      />
    </Stack.Navigator>
  );
};

const ClientStack: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="LoansTab"
        component={LoansStack}
        options={{
          title: 'Loans',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="DocumentsTab"
        component={DocumentUploadScreen}
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size }) => (
            <Upload color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default ClientStack;
