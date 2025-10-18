/**
 * Biometric Setup Screen
 * Version: v2.4.2
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Fingerprint, Check } from 'lucide-react-native';
import { AuthService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

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
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          {isEnabled ? (
            <Check color="#10b981" size={80} />
          ) : (
            <Fingerprint color="#2563eb" size={80} />
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isEnabled ? 'Biometric Enabled' : 'Enable Biometric Login'}
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          {isEnabled
            ? 'You can now use biometric authentication to quickly and securely access your account.'
            : 'Use Face ID, Touch ID, or Fingerprint to quickly and securely access your account.'}
        </Text>

        {/* Actions */}
        {!isEnabled ? (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={handleEnableBiometric}
            >
              <Text style={styles.buttonText}>Enable Biometric Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleSkip}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});

export default BiometricSetupScreen;
