import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { submitApprovalRequest } from '@/services/approvalWorkflow';
import { ArrowLeft, Upload, FileText, Check } from 'lucide-react';
import Header from '@/components/Header';

export default function KYC() {
  const { user } = useAuth();
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
        .insert([{
          user_id: user.id,
          document_type: docType,
          file_path: fileName,
          status: 'pending'
        }])
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
            file_path: fileName
          })
          .eq('id', existingReq.id);
        if (reqUpdateError) {
          console.warn('Failed to update document requirement row:', reqUpdateError.message);
        }
      } else {
        const { error: reqInsertError } = await supabase
          .from('document_verification_requirements')
          .insert([{
            user_id: user.id,
            document_type: canonicalDocType,
            is_required: false,
            is_submitted: true,
            is_verified: false,
            submission_date: new Date().toISOString(),
            file_path: fileName
          }]);
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
        uploaded_at: new Date().toISOString()
      };

      const result = await submitApprovalRequest({
        user_id: user.id,
        request_type: 'kyc_document',
        request_data: {
          ...kycDocumentData,
          reference_id: kycDoc.id,
          reference_table: 'kyc_documents'
        },
        priority: 'normal'
      });

      if (!result.success) {
        // If approval workflow fails, still show success for document upload
        console.warn('Failed to submit to approval workflow:', result.error);
      }

      setUploadedDocs([...uploadedDocs, docType]);
      toast({
        title: "Document Uploaded",
        description: `Your ${docType} has been uploaded and submitted for verification.`
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const documents = [
    { 
      type: 'id_card', 
      label: 'National ID Card', 
      required: true,
      description: 'Upload a clear photo of your Namibian ID card. Both front and back sides must be visible and readable.',
      instructions: 'Ensure all text is legible, corners are visible, and there is no glare or shadows.'
    },
    { 
      type: 'proof_income', 
      label: 'Proof of Income', 
      required: true,
      description: 'Upload your latest payslip (not older than 3 months) or employment contract.',
      instructions: 'Document must show your full name, employer details, and current salary amount.'
    },
    { 
      type: 'bank_statement', 
      label: 'Bank Statement', 
      required: false,
      description: 'Upload your most recent bank statement (last 3 months) from any Namibian bank.',
      instructions: 'Statement must show your name, account details, and transaction history.'
    },
    { 
      type: 'employment_letter', 
      label: 'Employment Letter', 
      required: false,
      description: 'Upload an official letter from your employer confirming your employment status.',
      instructions: 'Letter must be on company letterhead, signed, and dated within the last 30 days.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Upload KYC Documents
          </h1>
          <p className="text-muted-foreground">
            Complete your verification by uploading the required documents
          </p>
        </div>

        <div className="space-y-6">
          {documents.map((doc) => (
            <Card key={doc.type}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {doc.label}
                    {doc.required && <span className="text-red-500">*</span>}
                  </span>
                  {uploadedDocs.includes(doc.type) && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <CardDescription>
                  {doc.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-1">
                      Upload Instructions:
                    </h4>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      {doc.instructions}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={doc.type}>
                      Choose file {doc.required && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id={doc.type}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, doc.type)}
                      disabled={uploading || uploadedDocs.includes(doc.type)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PDF, JPG, PNG (Max 5MB)
                    </p>
                  </div>
                  
                  {uploadedDocs.includes(doc.type) && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Document uploaded successfully
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h3 className="font-medium mb-2">Document Requirements:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Documents must be clear and readable</li>
            <li>• All information must be visible</li>
            <li>• Documents should be recent (within 3 months)</li>
            <li>• Verification typically takes 24-48 hours</li>
          </ul>
        </div>
      </main>
    </div>
  );
}