/**
 * Approver Stack Navigator with Bottom Tabs
 * Version: v2.7.0 - Theme system integration
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { ClipboardList, User, Home } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../theme';

// Screens
import ApprovalQueueScreen from '../screens/approver/ApprovalQueueScreen';
import ReviewApplicationScreen from '../screens/approver/ReviewApplicationScreen';
import ApproverProfileScreen from '../screens/approver/ApproverProfileScreen';
import ApproverDashboardScreen from '../screens/approver/ApproverDashboardScreen';

export type ApprovalsStackParamList = {
  ApprovalQueue: undefined;
  ReviewApplication: { requestId: string };
};

export type ApproverTabParamList = {
  DashboardTab: undefined;
  ApprovalsTab: NavigatorScreenParams<ApprovalsStackParamList>;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<ApproverTabParamList>();
const Stack = createNativeStackNavigator<ApprovalsStackParamList>();

// Approvals Stack (for nested navigation)
const ApprovalsStack = () => {
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
        name="ApprovalQueue" 
        component={ApprovalQueueScreen}
        options={{ title: 'Approval Queue', headerShown: false }}
      />
      <Stack.Screen 
        name="ReviewApplication" 
        component={ReviewApplicationScreen}
        options={{ title: 'Review Application', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Badge component for notification count
const TabBarBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

const ApproverStack: React.FC = () => {
  const { colors } = useTheme();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Fetch pending count
    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    fetchPendingCount();

    // Subscribe to changes
    const subscription = supabase
      .channel('approval_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approval_requests' },
        () => fetchPendingCount()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#71717a',
        tabBarStyle: {
          backgroundColor: 'rgba(24, 24, 27, 0.9)',
          borderTopColor: '#27272a',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          position: 'absolute',
          bottom: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 0,
        },
        headerStyle: { backgroundColor: '#09090b', borderBottomColor: '#27272a', borderBottomWidth: 1 },
        headerTintColor: '#ffffff',
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={ApproverDashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ApprovalsTab"
        component={ApprovalsStack}
        options={{
          title: 'Approvals',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ApproverProfileScreen}
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

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ApproverStack;
