/**
 * Authentication Stack Navigator
 * Version: v2.4.2
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import BiometricSetupScreen from '../screens/auth/BiometricSetupScreen';

export type AuthStackParamList = {
  Login: undefined;
  BiometricSetup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ title: 'NamLend - Sign In' }}
      />
      <Stack.Screen 
        name="BiometricSetup" 
        component={BiometricSetupScreen}
        options={{ title: 'NamLend - Biometric Setup' }}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;
