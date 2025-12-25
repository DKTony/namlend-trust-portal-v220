/**
 * Session Lock Screen
 * Version: v2.6.0
 * 
 * Displays when session is locked due to inactivity
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Lock, Fingerprint } from 'lucide-react-native';
import { NeoButton } from './neo/NeoButton';
import { AmbientGlow } from './neo/AmbientGlow';

interface SessionLockScreenProps {
  onUnlock: () => Promise<boolean>;
  biometricAvailable: boolean;
}

export default function SessionLockScreen({ onUnlock, biometricAvailable }: SessionLockScreenProps) {
  const [unlocking, setUnlocking] = React.useState(false);

  const handleUnlock = async () => {
    setUnlocking(true);
    const success = await onUnlock();
    if (!success) {
      setUnlocking(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-950 justify-center items-center px-8">
      <AmbientGlow position="top" />
      
      <View className="items-center w-full max-w-sm">
        <View className="w-32 h-32 rounded-full bg-zinc-900 border-2 border-zinc-800 items-center justify-center mb-8 shadow-lg shadow-black/50">
          <Lock color="#3b82f6" size={64} />
        </View>

        <Text className="text-3xl font-sans-bold text-white mb-3 text-center tracking-tight">
          Session Locked
        </Text>
        <Text className="text-zinc-400 text-center font-sans text-base leading-6 mb-8">
          Your session has been locked due to inactivity
        </Text>

        <View className="w-full">
          <NeoButton
            title={unlocking ? 'Unlocking...' : biometricAvailable ? 'Unlock with Biometrics' : 'Unlock'}
            onPress={handleUnlock}
            disabled={unlocking}
            variant="primary"
            size="lg"
            icon={biometricAvailable ? <Fingerprint color="#ffffff" size={24} /> : undefined}
            className="shadow-lg shadow-blue-900/20"
          />
        </View>

        <Text className="text-zinc-600 text-xs text-center mt-6 font-sans">
          This helps keep your account secure
        </Text>
      </View>
    </View>
  );
}
