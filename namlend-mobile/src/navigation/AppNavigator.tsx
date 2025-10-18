/**
 * Main App Navigator
 * Version: v2.4.2
 * 
 * Routes users based on authentication state and role
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';

// Navigation stacks
import AuthStack from './AuthStack';
import ClientStack from './ClientStack';
import ApproverStack from './ApproverStack';

// Loading screen
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2563eb" />
  </View>
);

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  const linking = {
    prefixes: [],
    config: {
      screens: {
        Auth: 'auth',
        Client: 'client',
        Approver: 'approver',
      },
    },
  };

  return (
    <NavigationContainer 
      linking={linking}
      documentTitle={{
        formatter: (options, route) =>
          `NamLend Mobile - ${options?.title ?? route?.name ?? 'Loading'}`,
      }}
    >
      {isLoading ? (
        <LoadingScreen />
      ) : (
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
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

export default AppNavigator;
