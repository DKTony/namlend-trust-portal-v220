import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const SanityScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NamLend Mobile</Text>
      <Text style={styles.subtitle}>Sanity Check: Expo is running</Text>
      <Text style={styles.env}>Platform: {Platform.OS}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 12,
  },
  env: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
  },
});

export default SanityScreen;
