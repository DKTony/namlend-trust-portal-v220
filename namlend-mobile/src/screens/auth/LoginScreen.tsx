/**
 * Login Screen with Biometric Support
 * Version: v2.7.0 (Neo-Fintech Design)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Fingerprint, Shield, Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { NeoInput } from '../../components/neo/NeoInput';
import { NeoButton } from '../../components/neo/NeoButton';
import { AmbientGlow } from '../../components/neo/AmbientGlow';
import { useTheme } from '../../theme';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  
  const { signIn, biometricEnabled, authenticateWithBiometric } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Unknown error');
    }
  };

  const handleBiometricLogin = async () => {
    const result = await authenticateWithBiometric();
    
    if (result.success) {
      // In a real app, you'd auto-login here. 
      // For now, we simulate success or show message.
      Alert.alert('Authenticated', 'Biometric verified successfully');
    } else {
      Alert.alert('Authentication Failed', 'Biometric authentication failed');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-zinc-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AmbientGlow position="top" />
      
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="flex-1 justify-center px-6 py-12">
          {/* Header Section */}
          <View className="items-center mb-12">
            {/* Logo Motif: Rotated Square */}
            <View className="relative w-24 h-24 items-center justify-center mb-6">
              <View className="absolute w-16 h-16 bg-blue-600 rounded-2xl rotate-45 shadow-lg shadow-blue-500/20" />
              <View className="w-20 h-20 bg-zinc-900 rounded-3xl items-center justify-center border border-zinc-800 shadow-xl z-10">
                <Shield size={32} color="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              </View>
            </View>

            <Text className="text-4xl font-sans-bold text-white mb-2 tracking-tight text-center">
              NamLend
            </Text>
            <Text className="text-zinc-500 text-xs font-sans-medium tracking-wider uppercase text-center">
              Financial Freedom Starts Here
            </Text>
          </View>

          {/* Form Section */}
          <View className="space-y-4 mb-8">
            <NeoInput
              label="EMAIL ADDRESS"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              icon={<Mail size={20} color="#71717a" />}
              editable={!loading}
            />

            <NeoInput
              label="PASSWORD"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              icon={<Lock size={20} color="#71717a" />}
              editable={!loading}
            />

            <NeoButton
              title={loading ? "Verifying..." : "Sign In"}
              onPress={handleLogin}
              loading={loading}
              variant="primary"
              size="lg"
              className="mt-4"
            />
          </View>

          {/* Biometric Section */}
          {biometricEnabled && (
            <View className="mt-4 mb-8">
              <View className="flex-row items-center mb-6">
                <View className="flex-1 h-[1px] bg-zinc-800" />
                <Text className="mx-4 text-zinc-500 text-xs font-sans-medium tracking-wider">OR LOGIN WITH</Text>
                <View className="flex-1 h-[1px] bg-zinc-800" />
              </View>

              <NeoButton
                title={Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint'}
                onPress={handleBiometricLogin}
                variant="outline"
                icon={<Fingerprint size={20} color="#3b82f6" />}
                className="border-zinc-800 bg-zinc-900"
              />
            </View>
          )}

          {/* Footer */}
          <View className="items-center mt-auto pt-8">
            <Text className="text-zinc-600 text-xs text-center mb-1 font-sans">
              Regulated by Bank of Namibia
            </Text>
            <Text className="text-zinc-700 text-[10px] text-center font-sans tracking-wide">
              MAXIMUM APR: 32% • v2.7.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

