/**
 * Biometric Setup Screen
 * Version: v2.7.0 (Neo-Fintech Design)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
} from 'react-native';
import { Fingerprint, Check, Shield } from 'lucide-react-native';
import { AuthService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';

const BiometricSetupScreen: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const { setBiometricEnabled } = useAuthStore();

  const handleEnableBiometric = async () => {
    const available = await AuthService.isBiometricAvailable();
    
    if (!available) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on this device'
      );
      return;
    }

    const success = await AuthService.authenticateWithBiometric();
    
    if (success) {
      setIsEnabled(true);
      setBiometricEnabled(true);
      Alert.alert(
        'Success',
        'Biometric authentication has been enabled',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Failed', 'Biometric authentication failed');
    }
  };

  const handleSkip = () => {
    // Navigate to main app (handled by navigation state)
  };

  return (
    <View className="flex-1 bg-zinc-950 px-6 justify-center">
      <AmbientGlow position="top" />
      
      <View className="items-center mb-10">
        <View className={`w-24 h-24 rounded-full items-center justify-center mb-6 border-2 shadow-lg shadow-black/50 ${
          isEnabled 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-blue-600/10 border-blue-500/30'
        }`}>
          {isEnabled ? (
            <Check color="#10b981" size={48} />
          ) : (
            <Fingerprint color="#3b82f6" size={48} />
          )}
        </View>

        <Text className="text-3xl font-sans-bold text-white mb-3 text-center tracking-tight">
          {isEnabled ? 'Secured & Ready' : 'Secure Access'}
        </Text>
        
        <Text className="text-zinc-400 text-center font-sans text-base leading-6 px-4">
          {isEnabled
            ? 'Your account is now protected with biometric security.'
            : 'Enable Face ID or Fingerprint for faster, secure access to your financial dashboard.'}
        </Text>
      </View>

      <NeoCard className="bg-zinc-900 border-zinc-800 mb-8 p-6">
        <View className="flex-row items-center mb-4">
          <Shield size={20} color="#71717a" className="mr-3" />
          <Text className="text-zinc-200 font-sans-medium text-sm">Bank-Grade Security</Text>
        </View>
        <Text className="text-zinc-500 text-xs leading-5 font-sans">
          Your biometric data is stored securely on your device and never shared with NamLend servers. We use native device security enclave.
        </Text>
      </NeoCard>

      <View className="space-y-4">
        {!isEnabled ? (
          <>
            <NeoButton
              title="Enable Biometrics"
              onPress={handleEnableBiometric}
              variant="primary"
              size="lg"
              icon={<Fingerprint size={20} color="white" />}
              className="shadow-lg shadow-blue-900/20"
            />

            <NeoButton
              title="Skip for Now"
              onPress={handleSkip}
              variant="ghost"
              size="md"
            />
          </>
        ) : (
          <NeoButton
            title="Continue to Dashboard"
            onPress={handleSkip}
            variant="success"
            size="lg"
            className="bg-emerald-600 border-emerald-500"
          />
        )}
      </View>
    </View>
  );
};

export default BiometricSetupScreen;

