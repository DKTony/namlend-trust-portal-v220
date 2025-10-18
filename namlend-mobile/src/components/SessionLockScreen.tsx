/**
 * Session Lock Screen
 * Version: v2.6.0
 * 
 * Displays when session is locked due to inactivity
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock, Fingerprint } from 'lucide-react-native';

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
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Lock color="#2563eb" size={64} />
        </View>

        <Text style={styles.title}>Session Locked</Text>
        <Text style={styles.subtitle}>
          Your session has been locked due to inactivity
        </Text>

        <TouchableOpacity
          style={styles.unlockButton}
          onPress={handleUnlock}
          disabled={unlocking}
        >
          {biometricAvailable && <Fingerprint color="#ffffff" size={24} />}
          <Text style={styles.unlockButtonText}>
            {unlocking ? 'Unlocking...' : biometricAvailable ? 'Unlock with Biometrics' : 'Unlock'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          This helps keep your account secure
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 250,
    marginBottom: 16,
  },
  unlockButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
