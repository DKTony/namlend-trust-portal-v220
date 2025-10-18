/**
 * Approver Stack Navigator with Bottom Tabs
 * Version: v2.4.2
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClipboardList, User, Home } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';

// Screens
import ApprovalQueueScreen from '../screens/approver/ApprovalQueueScreen';
import ReviewApplicationScreen from '../screens/approver/ReviewApplicationScreen';
import ProfileScreen from '../screens/client/ProfileScreen';
import ApproverProfileScreen from '../screens/approver/ApproverProfileScreen';
import ApproverDashboardScreen from '../screens/approver/ApproverDashboardScreen';

export type ApproverStackParamList = {
  ApproverDashboard: undefined;
  ApprovalQueue: undefined;
  ReviewApplication: { requestId: string };
  ApproverProfile: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<ApproverStackParamList>();

// Approvals Stack (for nested navigation)
const ApprovalsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ApprovalQueue" 
        component={ApprovalQueueScreen}
        options={{ title: 'Approval Queue' }}
      />
      <Stack.Screen 
        name="ReviewApplication" 
        component={ReviewApplicationScreen}
        options={{ title: 'Review Application' }}
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
        component={ApproverDashboardScreen}
        options={{
          title: 'Dashboard',
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
