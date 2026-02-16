import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { submitApprovalRequest } from '@/services/approvalWorkflow';
import { ArrowLeft, Upload, FileText, Check } from 'lucide-react';
import Header from '@/components/Header';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const documents = [
  { type: 'id_card', translationKey: 'documents.idCard', required: true },
  { type: 'proof_income', translationKey: 'documents.proofIncome', required: true },
  { type: 'bank_statement', translationKey: 'documents.bankStatement', required: false },
  { type: 'employment_letter', translationKey: 'documents.employmentLetter', required: false },
] as const;

export default function KYC() {
  const { t } = useTranslation('kyc');
  const { user } = useAuth();
  const { styles } = useTheme();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const mapToCanonicalDocType = (doc: string): string => {
        switch (doc) {
          case 'id_card':
            return 'id_document';
          case 'proof_income':
            return 'payslip';
          case 'bank_statement':
            return 'bank_statement_1';
          case 'employment_letter':
            return 'employment_letter';
          default:
            return doc;
        }
      };

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docType}-${Date.now()}.${fileExt}`;
      const canonicalDocType = mapToCanonicalDocType(docType);

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create KYC document record
      const { data: kycDoc, error: dbError } = await supabase
        .from('kyc_documents')
        .insert([
          {
            user_id: user.id,
            document_type: docType,
            file_path: fileName,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Sync with document_verification_requirements (standardize source of truth)
      // Try update existing requirement; if none, insert a non-required record to avoid gating drift
      const { data: existingReq, error: reqFetchError } = await supabase
        .from('document_verification_requirements')
        .select('id')
        .eq('user_id', user.id)
        .eq('document_type', canonicalDocType)
        .maybeSingle();

      if (reqFetchError) {
        console.warn('Could not fetch document requirement row:', reqFetchError.message);
      }

      if (existingReq?.id) {
        const { error: reqUpdateError } = await supabase
          .from('document_verification_requirements')
          .update({
            is_submitted: true,
            submission_date: new Date().toISOString(),
            file_path: fileName,
          })
          .eq('id', existingReq.id);
        if (reqUpdateError) {
          console.warn('Failed to update document requirement row:', reqUpdateError.message);
        }
      } else {
        const { error: reqInsertError } = await supabase
          .from('document_verification_requirements')
          .insert([
            {
              user_id: user.id,
              document_type: canonicalDocType,
              is_required: false,
              is_submitted: true,
              is_verified: false,
              submission_date: new Date().toISOString(),
              file_path: fileName,
            },
          ]);
        if (reqInsertError) {
          console.warn('Failed to insert document requirement row:', reqInsertError.message);
        }
      }

      // Submit to approval workflow for verification
      const kycDocumentData = {
        document_type: canonicalDocType,
        file_path: fileName,
        file_size: file.size,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
      };

      const result = await submitApprovalRequest({
        user_id: user.id,
        request_type: 'kyc_document',
        request_data: {
          ...kycDocumentData,
          reference_id: kycDoc.id,
          reference_table: 'kyc_documents',
        },
        priority: 'normal',
      });

      if (!result.success) {
        // If approval workflow fails, still show success for document upload
        console.warn('Failed to submit to approval workflow:', result.error);
      }

      setUploadedDocs([...uploadedDocs, docType]);
      toast({
        title: t('toast.uploadedTitle'),
        description: t('toast.uploadedDescription', { docType }),
      });
    } catch (error) {
      toast({
        title: t('toast.failedTitle'),
        description: t('toast.failedDescription'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('min-h-screen transition-colors duration-500', styles.background)}>
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        <ThemedButton
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4 pl-0 hover:bg-transparent hover:text-primary justify-start"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToDashboard')}
        </ThemedButton>

        <div className="mb-8">
          <h1 className={cn('text-3xl font-bold mb-2', styles.textClass)}>{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="space-y-6">
          {documents.map((doc) => (
            <ThemedCard key={doc.type}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('flex items-center gap-2 font-bold', styles.textClass)}>
                  <FileText className="h-5 w-5" />
                  {t(`${doc.translationKey}.label`)}
                  {doc.required && <span className="text-red-500">*</span>}
                </span>
                {uploadedDocs.includes(doc.type) && <Check className="h-5 w-5 text-green-600" />}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t(`${doc.translationKey}.description`)}
              </p>

              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-1">
                    {t('uploadInstructions')}
                  </h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {t(`${doc.translationKey}.instructions`)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={doc.type}>
                    {t('chooseFile')} {doc.required && <span className="text-red-500">*</span>}
                  </Label>
                  <ThemedInput
                    id={doc.type}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, doc.type)}
                    disabled={uploading || uploadedDocs.includes(doc.type)}
                  />
                  <p className="text-xs text-muted-foreground">{t('acceptedFormats')}</p>
                </div>

                {uploadedDocs.includes(doc.type) && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      {t('uploadedSuccess')}
                    </span>
                  </div>
                )}
              </div>
            </ThemedCard>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium mb-2 text-foreground">{t('requirements.title')}</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {t('requirements.clear')}</li>
            <li>• {t('requirements.visible')}</li>
            <li>• {t('requirements.recent')}</li>
            <li>• {t('requirements.verification')}</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
