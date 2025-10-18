/**
 * Profile Edit Screen
 * Version: v2.7.1 - Theme system integration
 * 
 * Allows users to edit their profile information
 * Schema-aligned with live profiles table
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';
import { useTheme } from '../../theme';
import { PrimaryButton } from '../../components/ui';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone_number: string;
  id_number: string;
  employment_status: string;
  monthly_income: string;
}

export default function ProfileEditScreen() {
  const { colors, tokens } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    phone_number: '',
    id_number: '',
    employment_status: '',
    monthly_income: '',
  });
  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user?.profile) {
      setLoading(false);
      return;
    }

    setFormData({
      first_name: user.profile.first_name || '',
      last_name: user.profile.last_name || '',
      phone_number: user.profile.phone_number || '',
      id_number: user.profile.id_number || '',
      employment_status: user.profile.employment_status || '',
      monthly_income: user.profile.monthly_income?.toString() || '',
    });
    setLoading(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileFormData> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (formData.phone_number && !/^\+?[0-9]{10,15}$/.test(formData.phone_number.replace(/\s/g, ''))) {
      newErrors.phone_number = 'Invalid phone number format';
    }

    if (formData.monthly_income) {
      const income = parseFloat(formData.monthly_income);
      if (isNaN(income) || income < 0) {
        newErrors.monthly_income = 'Invalid income amount';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setSaving(true);

    try {
      // Prepare update data - only include fields that exist in schema
      const updateData: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number.trim() || null,
        id_number: formData.id_number.trim() || null,
        employment_status: formData.employment_status || null,
        monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert(
        'Update Failed',
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEmploymentStatusSelect = () => {
    Alert.alert('Select Employment Status', '', [
      {
        text: 'Employed Full-time',
        onPress: () => setFormData({ ...formData, employment_status: 'employed_full_time' }),
      },
      {
        text: 'Employed Part-time',
        onPress: () => setFormData({ ...formData, employment_status: 'employed_part_time' }),
      },
      {
        text: 'Self-employed',
        onPress: () => setFormData({ ...formData, employment_status: 'self_employed' }),
      },
      {
        text: 'Retired',
        onPress: () => setFormData({ ...formData, employment_status: 'retired' }),
      },
      {
        text: 'Unemployed',
        onPress: () => setFormData({ ...formData, employment_status: 'unemployed' }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>First Name *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                borderColor: errors.first_name ? colors.error : colors.divider,
                color: colors.textPrimary,
              }]}
              placeholder="John"
              placeholderTextColor={colors.textTertiary}
              value={formData.first_name}
              onChangeText={(text) => setFormData({ ...formData, first_name: text })}
            />
            {errors.first_name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.first_name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Last Name *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                borderColor: errors.last_name ? colors.error : colors.divider,
                color: colors.textPrimary,
              }]}
              placeholder="Doe"
              placeholderTextColor={colors.textTertiary}
              value={formData.last_name}
              onChangeText={(text) => setFormData({ ...formData, last_name: text })}
            />
            {errors.last_name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.last_name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                borderColor: errors.phone_number ? colors.error : colors.divider,
                color: colors.textPrimary,
              }]}
              placeholder="+264 81 234 5678"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              value={formData.phone_number}
              onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
            />
            {errors.phone_number && <Text style={[styles.errorText, { color: colors.error }]}>{errors.phone_number}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ID Number</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                borderColor: colors.divider,
                color: colors.textPrimary,
              }]}
              placeholder="12345678901"
              placeholderTextColor={colors.textTertiary}
              value={formData.id_number}
              onChangeText={(text) => setFormData({ ...formData, id_number: text })}
            />
          </View>
        </View>

        {/* Employment Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Employment Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Employment Status</Text>
            <TouchableOpacity
              style={[styles.picker, {
                backgroundColor: colors.surface,
                borderColor: colors.divider,
              }]}
              onPress={handleEmploymentStatusSelect}
            >
              <Text style={[styles.pickerText, { color: formData.employment_status ? colors.textPrimary : colors.textTertiary }]}>
                {formData.employment_status
                  ? formData.employment_status
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                  : 'Select employment status'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Income (NAD)</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                borderColor: errors.monthly_income ? colors.error : colors.divider,
                color: colors.textPrimary,
              }]}
              placeholder="5000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              value={formData.monthly_income}
              onChangeText={(text) => setFormData({ ...formData, monthly_income: text })}
            />
            {errors.monthly_income && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.monthly_income}</Text>
            )}
          </View>
        </View>

        {/* Note */}
        <View style={[styles.noteCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            * Required fields{'\n'}
            Your profile information is used for loan application processing and verification.
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          variant="primary"
          loading={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  noteCard: {
    borderRadius: 8,
    padding: 12,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
