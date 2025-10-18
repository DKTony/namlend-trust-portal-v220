import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Eye,
  Download,
  Clock,
  Shield,
  Lock
} from 'lucide-react';

interface DocumentRequirement {
  id: string;
  document_type: string;
  is_required: boolean;
  is_submitted: boolean;
  is_verified: boolean;
  submission_date: string;
  verification_date: string;
  rejection_reason: string;
  file_path: string;
}

interface DocumentUploadProps {
  onDocumentUploaded: () => void;
}

const DOCUMENT_TYPES = {
  id_document: {
    label: 'National ID Document',
    description: 'Upload a clear photo of your Namibian ID card (both sides)',
    instructions: 'Ensure all text is legible and corners are visible',
    required: true
  },
  bank_statement_1: {
    label: 'Bank Statement (Month 1)',
    description: 'Most recent bank statement',
    instructions: 'Statement must be from the last 30 days',
    required: true
  },
  bank_statement_2: {
    label: 'Bank Statement (Month 2)',
    description: 'Second most recent bank statement',
    instructions: 'Statement from 30-60 days ago',
    required: true
  },
  bank_statement_3: {
    label: 'Bank Statement (Month 3)',
    description: 'Third most recent bank statement',
    instructions: 'Statement from 60-90 days ago',
    required: true
  },
  payslip: {
    label: 'Recent Payslip',
    description: 'Most recent salary slip or proof of income',
    instructions: 'Must be from the last 30 days',
    required: true
  },
  proof_of_residence: {
    label: 'Proof of Residence',
    description: 'Utility bill or municipal account',
    instructions: 'Must be from the last 3 months',
    required: false
  },
  employment_letter: {
    label: 'Employment Letter',
    description: 'Letter from employer confirming employment',
    instructions: 'Must be on company letterhead',
    required: false
  }
};

export default function DocumentVerificationSystem({ onDocumentUploaded }: DocumentUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentRequirement[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    required_docs: number;
    verified_docs: number;
    profile_completion_percentage: number;
    missing_required_docs: string[];
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchEligibility();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document_verification_requirements')
        .select('*')
        .eq('user_id', user?.id)
        .order('document_type');

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load document requirements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibility = async () => {
    try {
      const { data, error } = await supabase.rpc('check_loan_eligibility');
      if (error) throw error;
      // data is a single row table return
      if (Array.isArray(data) && data.length > 0) {
        setEligibility(data[0] as any);
      } else if (data) {
        setEligibility(data as any);
      }
    } catch (err) {
      console.warn('Eligibility RPC failed, falling back to local calculations:', err);
    }
  };

  const handleFileUpload = async (docType: string, file: File) => {
    if (!user || !file) return;

    setUploading(docType);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docType}-${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update document requirement record
      const { error: updateError } = await supabase
        .from('document_verification_requirements')
        .update({
          is_submitted: true,
          submission_date: new Date().toISOString(),
          file_path: fileName
        })
        .eq('user_id', user.id)
        .eq('document_type', docType);

      if (updateError) throw updateError;

      // Refresh documents and eligibility
      await fetchDocuments();
      await fetchEligibility();
      onDocumentUploaded();

      toast({
        title: "Document Uploaded",
        description: `Your ${DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES]?.label} has been uploaded successfully.`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
      setSelectedFile(null);
      setUploadingDocType(null);
    }
  };

  const getDocumentStatus = (doc: DocumentRequirement) => {
    if (doc.is_verified) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        text: 'Verified',
        variant: 'default' as const,
        color: 'text-green-600'
      };
    }
    if (doc.is_submitted) {
      return {
        icon: <Clock className="h-5 w-5 text-yellow-600" />,
        text: 'Under Review',
        variant: 'secondary' as const,
        color: 'text-yellow-600'
      };
    }
    if (doc.rejection_reason) {
      return {
        icon: <X className="h-5 w-5 text-red-600" />,
        text: 'Rejected',
        variant: 'destructive' as const,
        color: 'text-red-600'
      };
    }
    return {
      icon: <AlertCircle className="h-5 w-5 text-gray-400" />,
      text: doc.is_required ? 'Required' : 'Optional',
      variant: 'outline' as const,
      color: 'text-gray-400'
    };
  };

  const calculateProgress = () => {
    if (eligibility) {
      const { required_docs, verified_docs } = eligibility;
      return required_docs > 0 ? (verified_docs / required_docs) * 100 : 0;
    }
    const requiredDocs = documents.filter(d => d.is_required);
    const verifiedDocs = requiredDocs.filter(d => d.is_verified);
    return requiredDocs.length > 0 ? (verifiedDocs.length / requiredDocs.length) * 100 : 0;
  };

  const isEligibleForLoanApplication = () => {
    if (eligibility) return !!eligibility.eligible;
    const requiredDocs = documents.filter(d => d.is_required);
    return requiredDocs.every(d => d.is_verified);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Document Verification Progress
            </span>
            <Badge variant={isEligibleForLoanApplication() ? 'default' : 'secondary'}>
              {isEligibleForLoanApplication() ? 'Loan Eligible' : 'Verification Required'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Verification Progress</span>
              <span>{Math.round(calculateProgress())}% Complete</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {documents.filter(d => d.is_required && d.is_verified).length} of{' '}
                {documents.filter(d => d.is_required).length} required documents verified
              </span>
              {isEligibleForLoanApplication() && (
                <span className="text-green-600 font-medium">✓ Ready to apply for loans</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Control Notice */}
      {!isEligibleForLoanApplication() && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Loan Application Access Restricted</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Complete document verification to unlock loan application functionality. 
                  All required documents must be verified before you can proceed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document List */}
      <div className="space-y-4">
        {documents.map((doc) => {
          const docInfo = DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES];
          const status = getDocumentStatus(doc);
          
          return (
            <Card key={doc.id} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">
                      {status.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{docInfo?.label || doc.document_type}</h4>
                        {doc.is_required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {docInfo?.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {docInfo?.instructions}
                      </p>
                      
                      {doc.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Rejection Reason:</strong> {doc.rejection_reason}
                        </div>
                      )}
                      
                      {doc.verification_date && (
                        <p className="text-xs text-green-600 mt-2">
                          Verified on {new Date(doc.verification_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge variant={status.variant} className={status.color}>
                      {status.text}
                    </Badge>
                    
                    {doc.is_submitted && doc.file_path && (
                      <Button variant="ghost" size="sm" aria-label={`View ${docInfo?.label || doc.document_type} document`} title={`View ${docInfo?.label || doc.document_type}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {(!doc.is_submitted || doc.rejection_reason) && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                              setUploadingDocType(doc.document_type);
                            }
                          }}
                          className="hidden"
                          id={`file-${doc.document_type}`}
                        />
                        <Label htmlFor={`file-${doc.document_type}`}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={uploading === doc.document_type}
                            asChild
                          >
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              {uploading === doc.document_type ? 'Uploading...' : 'Upload'}
                            </span>
                          </Button>
                        </Label>
                        
                        {selectedFile && uploadingDocType === doc.document_type && (
                          <Button
                            size="sm"
                            onClick={() => handleFileUpload(doc.document_type, selectedFile)}
                            disabled={uploading === doc.document_type}
                          >
                            Confirm Upload
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Document Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Accepted formats: PDF, JPG, JPEG, PNG</li>
            <li>Maximum file size: 10MB per document</li>
            <li>Ensure documents are clear and all text is readable</li>
            <li>Bank statements must show your name and account details</li>
            <li>ID documents must show both front and back sides</li>
            <li>Documents will be reviewed within 24-48 hours</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
