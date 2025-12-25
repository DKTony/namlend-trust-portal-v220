/**
 * Main App Navigator
 * Version: v2.7.0
 * 
 * Routes users based on authentication state and role
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme';

// Navigation stacks
import AuthStack from './AuthStack';
import ClientStack from './ClientStack';
import ApproverStack from './ApproverStack';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen 
          name="Auth" 
          component={AuthStack}
          options={{ title: 'Sign In' }}
        />
      ) : user?.role === 'admin' || user?.role === 'loan_officer' ? (
        <Stack.Screen 
          name="Approver" 
          component={ApproverStack}
          options={{ title: 'Approvals' }}
        />
      ) : (
        <Stack.Screen 
          name="Client" 
          component={ClientStack}
          options={{ title: 'Dashboard' }}
        />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;
