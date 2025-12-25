/**
 * Profile Edit Screen
 * Version: v2.7.1 - Neo-Fintech Design
 * 
 * Allows users to edit their profile information
 * Schema-aligned with live profiles table
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, User, Phone, FileText, Briefcase, DollarSign } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';
import { useTheme } from '../../theme';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoInput } from '../../components/neo/NeoInput';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone_number: string;
  id_number: string;
  employment_status: string;
  monthly_income: string;
}

export default function ProfileEditScreen() {
  const { colors, mode } = useTheme();
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

  // Theme styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const headerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-white';
  const borderColor = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-500';
  const inputBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const iconColor = mode === 'dark' ? '#71717a' : '#9ca3af';
  const headerIconColor = mode === 'dark' ? '#fff' : '#000';
  const headerIconBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200';

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
      <View className={`flex-1 ${containerBg} justify-center items-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${containerBg}`}
    >
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      {/* Header */}
      <View className={`flex-row items-center justify-between px-4 pt-16 pb-4 ${headerBg} border-b ${borderColor}`}>
        <TouchableOpacity onPress={() => navigation.goBack()} className={`p-2 -ml-2 rounded-full border ${headerIconBg}`}>
          <ArrowLeft color={headerIconColor} size={24} />
        </TouchableOpacity>
        <Text className={`${textColor} text-lg font-sans-bold tracking-tight`}>Edit Profile</Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Personal Information */}
        <View className="mb-8">
          <Text className={`${subTextColor} text-xs font-sans-medium mb-4 uppercase tracking-wider`}>
            Personal Information
          </Text>

          <NeoInput
            label="FIRST NAME"
            value={formData.first_name}
            onChangeText={(text) => setFormData({ ...formData, first_name: text })}
            error={errors.first_name}
            icon={<User size={20} color={iconColor} />}
          />

          <NeoInput
            label="LAST NAME"
            value={formData.last_name}
            onChangeText={(text) => setFormData({ ...formData, last_name: text })}
            error={errors.last_name}
            icon={<User size={20} color={iconColor} />}
          />

          <NeoInput
            label="PHONE NUMBER"
            value={formData.phone_number}
            onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
            placeholder="+264 81 234 5678"
            keyboardType="phone-pad"
            error={errors.phone_number}
            icon={<Phone size={20} color={iconColor} />}
          />

          <NeoInput
            label="ID NUMBER"
            value={formData.id_number}
            onChangeText={(text) => setFormData({ ...formData, id_number: text })}
            placeholder="12345678901"
            icon={<FileText size={20} color={iconColor} />}
          />
        </View>

        {/* Employment Information */}
        <View className="mb-8">
          <Text className={`${subTextColor} text-xs font-sans-medium mb-4 uppercase tracking-wider`}>
            Financial Information
          </Text>

          <View className="mb-4">
            <Text className={`${subTextColor} text-xs font-sans-medium mb-1.5 ml-1`}>
              EMPLOYMENT STATUS
            </Text>
            <TouchableOpacity
              onPress={handleEmploymentStatusSelect}
              className={`flex-row items-center ${inputBg} border ${borderColor} rounded-xl px-4 py-3.5`}
            >
              <Briefcase size={20} color={iconColor} className="mr-3" />
              <Text className={`text-base font-sans-medium flex-1 ${formData.employment_status ? (mode === 'dark' ? 'text-zinc-100' : 'text-zinc-900') : (mode === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}>
                {formData.employment_status
                  ? formData.employment_status
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                  : 'Select employment status'}
              </Text>
            </TouchableOpacity>
          </View>

          <NeoInput
            label="MONTHLY INCOME (NAD)"
            value={formData.monthly_income}
            onChangeText={(text) => setFormData({ ...formData, monthly_income: text })}
            placeholder="5000"
            keyboardType="numeric"
            error={errors.monthly_income}
            icon={<DollarSign size={20} color={iconColor} />}
          />
        </View>

        {/* Note */}
        <NeoCard variant="glass" className="mb-8 p-5">
          <Text className={`${subTextColor} text-xs leading-5 font-sans`}>
            * Required fields{'\n'}
            Your profile information is used for loan application processing and verification. Keeping it up-to-date helps us serve you better.
          </Text>
        </NeoCard>
      </ScrollView>

      {/* Save Button */}
      <View className={`px-6 py-4 ${headerBg} border-t ${borderColor}`}>
        <NeoButton
          title="Save Changes"
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          className="shadow-lg shadow-blue-900/20"
        />
      </View>
    </KeyboardAvoidingView>
  );
}


