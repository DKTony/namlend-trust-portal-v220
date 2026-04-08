import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { FileText, Check } from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
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
  const [activeTab] = useState('documents');

  // Convex mutations for KYC upload
  const generateUploadUrl = useMutation(api.users.generateKycUploadUrl);
  const recordKycDocument = useMutation(api.users.recordKycDocument);

  const handleTabChange = (tab: string) => {
    if (tab === 'documents') return;
    if (tab === 'budget') {
      navigate('/budget');
      return;
    }
    navigate('/dashboard', { state: { tab } });
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Step 1: Get a signed upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file directly to Convex Storage
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error('File upload failed');
      }

      const { storageId } = await uploadResult.json();

      // Step 3: Record the KYC document in the database
      await recordKycDocument({
        documentType: docType,
        fileStorageId: storageId,
        fileName: file.name,
        fileSize: file.size,
      });

      setUploadedDocs([...uploadedDocs, docType]);
      toast({
        title: t('toast.uploadedTitle'),
        description: t('toast.uploadedDescription', { docType }),
      });
    } catch (error) {
      console.error('KYC upload error:', error);
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
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title={t('title')}>
      <div className="max-w-2xl">
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
                  {doc.required && <span className="text-destructive">*</span>}
                </span>
                {uploadedDocs.includes(doc.type) && (
                  <Check className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t(`${doc.translationKey}.description`)}
              </p>

              <div className="space-y-4">
                <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm text-primary mb-1">
                    {t('uploadInstructions')}
                  </h4>
                  <p className="text-xs text-primary/80">
                    {t(`${doc.translationKey}.instructions`)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={doc.type}>
                    {t('chooseFile')} {doc.required && <span className="text-destructive">*</span>}
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
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">
                      {t('uploadedSuccess')}
                    </span>
                  </div>
                )}
              </div>
            </ThemedCard>
          ))}
        </div>

        <div className="mt-8 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
          <h3 className="font-medium mb-2 text-foreground">{t('requirements.title')}</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {t('requirements.clear')}</li>
            <li>• {t('requirements.visible')}</li>
            <li>• {t('requirements.recent')}</li>
            <li>• {t('requirements.verification')}</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
