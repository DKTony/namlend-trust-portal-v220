/**
 * Document Upload Screen with Camera Integration
 * Version: v2.7.1 - Neo-Fintech Theme Update
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Upload, FileText, CheckCircle, Info, HelpCircle, MessageCircle } from 'lucide-react-native';
import { supabase } from '../../services/supabaseClient';
import { useTheme } from '../../theme';
import { NeoCard } from '../../components/neo/NeoCard';
import { NeoButton } from '../../components/neo/NeoButton';
import { AmbientGlow } from '../../components/neo/AmbientGlow';

const DocumentUploadScreen: React.FC = () => {
  const { mode } = useTheme();
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const documentTypes = [
    { id: 'id_card', label: 'National ID Card', icon: FileText },
    { id: 'proof_income', label: 'Proof of Income', icon: FileText },
    { id: 'bank_statement', label: 'Bank Statement', icon: FileText },
  ];

  const handleUpload = (docType: string) => {
    Alert.alert(
      'Upload Document',
      'Choose upload method',
      [
        {
          text: 'Take Photo',
          onPress: () => handleCamera(docType),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => handleGallery(docType),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCamera = async (docType: string) => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Camera permission is needed.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      await uploadAsset(docType, asset.uri, asset.fileName || 'photo.jpg', asset.type ? `${asset.type}` : 'image/jpeg');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const handleGallery = async (docType: string) => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], multiple: false, copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      await uploadAsset(docType, asset.uri, asset.name || 'file', asset.mimeType || 'application/octet-stream');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const uploadAsset = async (docType: string, uri: string, name: string, contentType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }
    const res = await fetch(uri);
    const blob = await res.blob();
    const path = `${user.id}/${Date.now()}-${name}`;
    const upload = await supabase.storage.from('documents').upload(path, blob, { contentType });
    if (upload.error) {
      Alert.alert('Upload failed', upload.error.message);
      return;
    }
    await supabase.from('documents').insert({
      user_id: user.id,
      document_type: docType,
      file_url: path,
      file_name: name,
      file_size: (blob as any).size || null,
      uploaded_at: new Date().toISOString(),
      verified: false,
    });
    setUploadedDocs(prev => Array.from(new Set([...prev, docType])));
    Alert.alert('Uploaded', 'Document uploaded successfully');
  };

  // Theme-derived styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const headerBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const borderColor = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const cardBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const iconBgDefault = mode === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200';

  return (
    <View className={`flex-1 ${containerBg}`}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      {mode === 'dark' && <AmbientGlow position="top" />}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className={`px-6 pt-16 pb-6 ${headerBg} border-b ${borderColor}`}>
          <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
            KYC VERIFICATION
          </Text>
          <Text className={`${textColor} text-2xl font-sans-bold tracking-tight mb-1`}>
            Upload Documents
          </Text>
          <Text className={`${subTextColor} text-sm font-sans`}>
            Upload required documents for verification
          </Text>
        </View>

        {/* Document Types */}
        <View className="p-6">
          <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>
            Required Documents
          </Text>
          
          {documentTypes.map((docType) => {
            const Icon = docType.icon;
            const isUploaded = uploadedDocs.includes(docType.id);

            return (
              <TouchableOpacity
                key={docType.id}
                onPress={() => handleUpload(docType.id)}
                className={`flex-row items-center justify-between p-4 rounded-2xl border-2 mb-3 ${
                  isUploaded
                    ? 'bg-emerald-500/10 border-emerald-500'
                    : `${cardBg} ${borderColor}`
                }`}
              >
                <View className="flex-row items-center flex-1">
                  <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 border ${
                    isUploaded 
                      ? 'bg-emerald-500/20 border-emerald-500/30' 
                      : iconBgDefault
                  }`}>
                    <Icon size={24} color={isUploaded ? '#10b981' : (mode === 'dark' ? '#71717a' : '#94a3b8')} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-sans-medium ${isUploaded ? 'text-emerald-500' : textColor}`}>
                      {docType.label}
                    </Text>
                    <Text className={`text-xs font-sans mt-0.5 ${isUploaded ? 'text-emerald-400' : subTextColor}`}>
                      {isUploaded ? 'Uploaded ✓' : 'Required'}
                    </Text>
                  </View>
                </View>
                {isUploaded ? (
                  <CheckCircle color="#10b981" size={24} />
                ) : (
                  <Upload size={24} color={mode === 'dark' ? '#71717a' : '#94a3b8'} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Instructions */}
        <View className="px-6 mb-6">
          <NeoCard variant="glass" className="p-0 overflow-hidden">
            <View className={`flex-row items-center px-4 py-3 border-b ${borderColor} ${mode === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Info size={18} color="#3b82f6" />
              <Text className="text-blue-500 text-sm font-sans-bold ml-2">Document Guidelines</Text>
            </View>
            <View className="p-4">
              {[
                'Documents must be clear and readable',
                'File size should not exceed 5MB',
                'Accepted formats: JPG, PNG, PDF',
                'Ensure all corners are visible',
                'No glare or shadows'
              ].map((text, index) => (
                <View key={index} className="flex-row items-start mb-2 last:mb-0">
                  <Text className="text-blue-500 mr-2">•</Text>
                  <Text className={`${mode === 'dark' ? 'text-blue-400' : 'text-blue-600'} text-sm font-sans flex-1`}>
                    {text}
                  </Text>
                </View>
              ))}
            </View>
          </NeoCard>
        </View>

        {/* Help Section */}
        <View className="px-6 mb-8">
          <NeoCard variant="glass" className="p-4">
            <View className="flex-row items-center mb-3">
              <HelpCircle size={20} color={mode === 'dark' ? '#a1a1aa' : '#71717a'} />
              <Text className={`${textColor} text-base font-sans-bold ml-2`}>Need Help?</Text>
            </View>
            <Text className={`${subTextColor} text-sm font-sans mb-4 leading-5`}>
              Contact our support team if you have questions about document requirements.
            </Text>
            <NeoButton
              title="Contact Support"
              onPress={() => Alert.alert('Support', 'Contact support@namlend.com')}
              variant="outline"
              size="md"
              icon={<MessageCircle size={18} color="#3b82f6" />}
            />
          </NeoCard>
        </View>
      </ScrollView>
    </View>
  );
};

export default DocumentUploadScreen;
