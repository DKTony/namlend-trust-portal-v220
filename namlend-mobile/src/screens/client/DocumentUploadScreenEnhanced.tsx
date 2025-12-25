/**
 * Enhanced Document Upload Screen
 * Version: v2.7.0 - Neo-Fintech Design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { FileText, CheckCircle, AlertCircle, X, RefreshCw, Upload } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';
import { enqueue } from '../../utils/offlineQueue';
import { useTheme } from '../../theme';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const COMPRESSION_QUALITY = 0.7;

interface DocumentType {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

interface UploadedDocument {
  id: string;
  type: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  verified: boolean;
}

interface UploadProgress {
  type: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function DocumentUploadScreenEnhanced() {
  const { user } = useAuth();
  const { colors, mode } = useTheme();
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [loading, setLoading] = useState(true);

  const documentTypes: DocumentType[] = [
    {
      id: 'id_card',
      label: 'National ID / Passport',
      description: 'Front and back of your ID card or passport photo page',
      required: true,
    },
    {
      id: 'proof_income',
      label: 'Proof of Income',
      description: 'Recent payslip or bank statement showing income',
      required: true,
    },
    {
      id: 'bank_statement',
      label: 'Bank Statement',
      description: 'Last 3 months bank statement',
      required: false,
    },
  ];

  useEffect(() => {
    loadUploadedDocuments();
  }, []);

  const loadUploadedDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setUploadedDocs(
        data.map((doc: any) => ({
          id: doc.id,
          type: doc.document_type,
          fileName: doc.file_name,
          fileSize: doc.file_size || 0,
          uploadedAt: doc.uploaded_at,
          verified: doc.verified,
        }))
      );
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (docType: string) => {
    Alert.alert('Upload Document', 'Choose upload method', [
      {
        text: 'Take Photo',
        onPress: () => handleCamera(docType),
      },
      {
        text: 'Choose from Gallery',
        onPress: () => handleGallery(docType),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleCamera = async (docType: string) => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: COMPRESSION_QUALITY,
        base64: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      await processAndUpload(docType, asset.uri, asset.fileName || 'photo.jpg', 'image/jpeg');
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to take photo');
    }
  };

  const handleGallery = async (docType: string) => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      await processAndUpload(
        docType,
        asset.uri,
        asset.name || 'document',
        asset.mimeType || 'application/octet-stream'
      );
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to select document');
    }
  };

  const processAndUpload = async (
    docType: string,
    uri: string,
    fileName: string,
    contentType: string
  ) => {
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setUploadProgress((prev) => ({
      ...prev,
      [docType]: { type: docType, progress: 0, status: 'uploading' },
    }));

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      if (blob.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }

      setUploadProgress((prev) => ({
        ...prev,
        [docType]: { ...prev[docType], progress: 30 },
      }));

      const path = `${user.id}/${Date.now()}-${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, blob, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress((prev) => ({
        ...prev,
        [docType]: { ...prev[docType], progress: 70 },
      }));

      const { error: insertError } = await supabase.from('documents').insert({
        user_id: user.id,
        document_type: docType,
        file_url: path,
        file_name: fileName,
        file_size: blob.size,
        uploaded_at: new Date().toISOString(),
        verified: false,
      });

      if (insertError) throw insertError;

      setUploadProgress((prev) => ({
        ...prev,
        [docType]: { ...prev[docType], progress: 100, status: 'success' },
      }));

      Alert.alert('Success', 'Document uploaded successfully');
      await loadUploadedDocuments();

      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[docType];
          return newProgress;
        });
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);

      try {
        await enqueue({
          type: 'upload_document',
          payload: {
            user_id: user.id,
            document_type: docType,
            file_uri: uri,
            file_name: fileName,
            content_type: contentType,
          },
        });

        setUploadProgress((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            progress: 0,
            status: 'error',
            error: 'Queued for upload when online',
          },
        }));

        Alert.alert(
          'Queued for Upload',
          'Document will be uploaded when you have an internet connection.'
        );
      } catch (queueError) {
        setUploadProgress((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            progress: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          },
        }));

        Alert.alert(
          'Upload Failed',
          error instanceof Error ? error.message : 'Failed to upload document'
        );
      }
    }
  };

  const handleRetry = (docType: string) => {
    handleUpload(docType);
  };

  const handleDelete = async (docId: string, docType: string) => {
    Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('documents').delete().eq('id', docId);

            if (error) throw error;

            Alert.alert('Success', 'Document deleted successfully');
            await loadUploadedDocuments();
          } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', 'Failed to delete document');
          }
        },
      },
    ]);
  };

  const getDocumentStatus = (docType: string): 'none' | 'uploaded' | 'verified' => {
    const doc = uploadedDocs.find((d) => d.type === docType);
    if (!doc) return 'none';
    return doc.verified ? 'verified' : 'uploaded';
  };

  // Theme styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const cardBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const cardBorder = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const docInfoBg = mode === 'dark' ? 'bg-zinc-800/30' : 'bg-zinc-100';
  const iconColor = mode === 'dark' ? '#e4e4e7' : '#3f3f46';

  if (loading) {
    return (
      <View className={`flex-1 ${containerBg} justify-center items-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className={`${subTextColor} mt-4 font-sans`}>Loading documents...</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${containerBg}`}>
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Header */}
        <View className="mb-8 mt-4">
          <Text className={`${subTextColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
            VERIFICATION
          </Text>
          <Text className={`${textColor} text-3xl font-sans-bold tracking-tight mb-2`}>
            Documents
          </Text>
          <Text className={`${subTextColor} text-base font-sans leading-6`}>
            Upload required documents for KYC verification. Ensure photos are clear.
          </Text>
        </View>

        {/* Document Types */}
        {documentTypes.map((docType) => {
          const status = getDocumentStatus(docType.id);
          const progress = uploadProgress[docType.id];
          const uploadedDoc = uploadedDocs.find((d) => d.type === docType.id);

          return (
            <NeoCard key={docType.id} variant="glass" className="mb-6 p-5">
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <FileText color={iconColor} size={20} />
                    <Text className={`${textColor} font-sans-bold text-base flex-1 tracking-tight`}>
                      {docType.label}
                    </Text>
                  </View>
                  {docType.required && (
                    <View className="self-start bg-red-500/10 rounded px-2 py-0.5 mt-1 border border-red-500/20">
                      <Text className="text-red-400 text-[10px] font-sans-bold uppercase">Required</Text>
                    </View>
                  )}
                  <Text className={`${subTextColor} text-xs font-sans mt-2 leading-5`}>
                    {docType.description}
                  </Text>
                </View>

                {/* Status Icon */}
                {status === 'verified' && <CheckCircle color="#10b981" size={24} />}
                {status === 'uploaded' && <AlertCircle color="#f59e0b" size={24} />}
              </View>

              {/* Upload Progress */}
              {progress && progress.status === 'uploading' && (
                <View className="mb-4">
                  <View className={`h-2 ${mode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'} rounded-full overflow-hidden mb-1`}>
                    <View
                      className="h-full bg-blue-600"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </View>
                  <Text className={`${subTextColor} text-xs text-right font-sans-medium`}>
                    {Math.round(progress.progress)}%
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {progress && progress.status === 'error' && (
                <View className="bg-red-500/10 p-3 rounded-lg flex-row items-center mb-4 border border-red-500/20">
                  <AlertCircle color="#ef4444" size={16} />
                  <Text className="text-red-400 text-xs flex-1 ml-2 mr-2 font-sans-medium">
                    {progress.error}
                  </Text>
                  <TouchableOpacity onPress={() => handleRetry(docType.id)} className="p-1">
                    <RefreshCw color="#3b82f6" size={16} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Uploaded Document Info */}
              {uploadedDoc && !progress && (
                <View className={`${docInfoBg} p-3 rounded-xl mb-4 border ${cardBorder}`}>
                  <Text className={`${textColor} text-sm font-sans-medium mb-1`} numberOfLines={1}>
                    {uploadedDoc.fileName}
                  </Text>
                  <Text className={`${subTextColor} text-xs mb-2`}>
                    {(uploadedDoc.fileSize / 1024).toFixed(1)} KB •{' '}
                    {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                  </Text>
                  
                  <View className={`flex-row items-center gap-1.5 self-start px-2 py-1 rounded ${
                    uploadedDoc.verified ? 'bg-emerald-500/10' : 'bg-yellow-500/10'
                  }`}>
                    {uploadedDoc.verified ? (
                      <>
                        <CheckCircle color="#10b981" size={12} />
                        <Text className="text-emerald-500 text-[10px] font-sans-bold uppercase">Verified</Text>
                      </>
                    ) : (
                      <>
                        <AlertCircle color="#f59e0b" size={12} />
                        <Text className="text-yellow-500 text-[10px] font-sans-bold uppercase">Pending Review</Text>
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <NeoButton
                    title={uploadedDoc ? 'Replace' : 'Upload'}
                    onPress={() => handleUpload(docType.id)}
                    variant="primary"
                    size="sm"
                    loading={progress?.status === 'uploading'}
                    disabled={progress?.status === 'uploading'}
                    icon={!uploadedDoc ? <Upload size={16} color="white" /> : undefined}
                    className={!uploadedDoc ? "shadow-lg shadow-blue-900/20" : ""}
                  />
                </View>

                {uploadedDoc && !progress && (
                  <TouchableOpacity
                    className="w-10 h-10 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30"
                    onPress={() => handleDelete(uploadedDoc.id, docType.id)}
                  >
                    <X color="#ef4444" size={18} />
                  </TouchableOpacity>
                )}
              </View>
            </NeoCard>
          );
        })}

        {/* Help Text */}
        <View className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex-row items-start mb-8">
          <AlertCircle color="#3b82f6" size={20} />
          <View className="ml-3 flex-1">
            <Text className="text-blue-500 text-sm font-sans-bold mb-1">
              Upload Tips
            </Text>
            <Text className="text-blue-400 text-xs leading-5 font-sans">
              • Ensure documents are clear and readable{'\n'}
              • Maximum file size: 2MB per document{'\n'}
              • Accepted formats: JPG, PNG, PDF{'\n'}
              • Documents will be verified within 24-48 hours
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}


