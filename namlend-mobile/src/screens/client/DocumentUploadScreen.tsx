/**
 * Document Upload Screen with Camera Integration
 * Version: v2.4.2
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Camera, Upload, FileText, CheckCircle } from 'lucide-react-native';
import { supabase } from '../../services/supabaseClient';

const DocumentUploadScreen: React.FC = () => {
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

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Upload Documents</Text>
        <Text style={styles.subtitle}>
          Upload required documents for KYC verification
        </Text>
      </View>

      {/* Document Types */}
      <View style={styles.section}>
        {documentTypes.map((docType) => {
          const Icon = docType.icon;
          const isUploaded = uploadedDocs.includes(docType.id);

          return (
            <TouchableOpacity
              key={docType.id}
              style={[styles.docCard, isUploaded && styles.docCardUploaded]}
              onPress={() => handleUpload(docType.id)}
            >
              <View style={styles.docLeft}>
                <View style={styles.docIcon}>
                  <Icon color={isUploaded ? '#10b981' : '#6b7280'} size={24} />
                </View>
                <View>
                  <Text style={styles.docLabel}>{docType.label}</Text>
                  <Text style={styles.docStatus}>
                    {isUploaded ? 'Uploaded' : 'Required'}
                  </Text>
                </View>
              </View>
              {isUploaded ? (
                <CheckCircle color="#10b981" size={24} />
              ) : (
                <Upload color="#6b7280" size={24} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>Document Guidelines</Text>
        <Text style={styles.instructionText}>• Documents must be clear and readable</Text>
        <Text style={styles.instructionText}>• File size should not exceed 5MB</Text>
        <Text style={styles.instructionText}>• Accepted formats: JPG, PNG, PDF</Text>
        <Text style={styles.instructionText}>• Ensure all corners are visible</Text>
        <Text style={styles.instructionText}>• No glare or shadows</Text>
      </View>

      {/* Help Section */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          Contact our support team if you have questions about document requirements.
        </Text>
        <TouchableOpacity style={styles.helpButton}>
          <Text style={styles.helpButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  docCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  docCardUploaded: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  docStatus: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  instructionsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 6,
  },
  helpSection: {
    padding: 16,
    marginBottom: 32,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  helpButton: {
    height: 44,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
});

export default DocumentUploadScreen;
