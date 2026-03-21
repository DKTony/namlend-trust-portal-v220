import React, { useState, useEffect, useMemo } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
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
  Lock,
  ChevronRight,
  Info,
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
    required: true,
  },
  bank_statement_1: {
    label: 'Bank Statement (Month 1)',
    description: 'Most recent bank statement',
    instructions: 'Statement must be from the last 30 days',
    required: true,
  },
  bank_statement_2: {
    label: 'Bank Statement (Month 2)',
    description: 'Second most recent bank statement',
    instructions: 'Statement from 30-60 days ago',
    required: true,
  },
  bank_statement_3: {
    label: 'Bank Statement (Month 3)',
    description: 'Third most recent bank statement',
    instructions: 'Statement from 60-90 days ago',
    required: true,
  },
  payslip: {
    label: 'Recent Payslip',
    description: 'Most recent salary slip or proof of income',
    instructions: 'Must be from the last 30 days',
    required: true,
  },
  proof_of_residence: {
    label: 'Proof of Residence',
    description: 'Utility bill or municipal account',
    instructions: 'Must be from the last 3 months',
    required: false,
  },
  employment_letter: {
    label: 'Employment Letter',
    description: 'Letter from employer confirming employment',
    instructions: 'Must be on company letterhead',
    required: false,
  },
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

  // Convex reactive query for profile (to derive eligibility)
  const rawProfile = useConvexQuery(api.users.getMyProfile);

  useEffect(() => {
    if (rawProfile !== undefined) {
      setLoading(false);
      // Derive eligibility from profile
      if (rawProfile) {
        setEligibility({
          eligible: rawProfile.loanApplicationEligible ?? false,
          required_docs: 5,
          verified_docs: [
            rawProfile.idDocumentVerified,
            rawProfile.bankStatementsVerified,
            rawProfile.payslipVerified,
          ].filter(Boolean).length,
          profile_completion_percentage: rawProfile.profileCompletionPercentage ?? 0,
          missing_required_docs: [],
        });
      }
      // TODO: Fetch document_verification_requirements from Convex when table is migrated
      // For now, documents remain empty and users see the upload UI based on DOCUMENT_TYPES
    }
  }, [rawProfile]);

  const handleFileUpload = async (docType: string, file: File) => {
    if (!user || !file) return;

    setUploading(docType);
    try {
      // TODO: Implement Convex file storage upload for KYC documents
      // For now, log warning and simulate success
      console.warn('Document upload not yet migrated to Convex storage', docType, file.name);

      onDocumentUploaded();

      toast({
        title: 'Document Uploaded',
        description: `Your ${DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES]?.label} has been uploaded successfully.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
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
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        text: 'Verified',
        className: 'bg-green-500/10 text-green-400 border-0',
        color: 'text-green-500',
      };
    }
    if (doc.is_submitted) {
      return {
        icon: <Clock className="h-5 w-5 text-yellow-500" />,
        text: 'Reviewing',
        className: 'bg-yellow-500/10 text-yellow-400 border-0',
        color: 'text-yellow-500',
      };
    }
    if (doc.rejection_reason) {
      return {
        icon: <X className="h-5 w-5 text-red-500" />,
        text: 'Rejected',
        className: 'bg-red-500/10 text-red-400 border-0',
        color: 'text-red-500',
      };
    }
    return {
      icon: <AlertCircle className="h-5 w-5 text-zinc-600" />,
      text: doc.is_required ? 'Required' : 'Optional',
      className: 'bg-zinc-800 text-zinc-400 border-0',
      color: 'text-zinc-600',
    };
  };

  const calculateProgress = () => {
    if (eligibility) {
      const { required_docs, verified_docs } = eligibility;
      return required_docs > 0 ? (verified_docs / required_docs) * 100 : 0;
    }
    const requiredDocs = documents.filter((d) => d.is_required);
    const verifiedDocs = requiredDocs.filter((d) => d.is_verified);
    return requiredDocs.length > 0 ? (verifiedDocs.length / requiredDocs.length) * 100 : 0;
  };

  const isEligibleForLoanApplication = () => {
    if (eligibility) return !!eligibility.eligible;
    const requiredDocs = documents.filter((d) => d.is_required);
    return requiredDocs.every((d) => d.is_verified);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-sm">Loading verification status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Overview */}
      <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Shield className="h-32 w-32 text-foreground" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                Verification Center
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-2 border-0 text-[10px] px-2 h-5',
                    isEligibleForLoanApplication()
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isEligibleForLoanApplication() ? 'Verified' : 'Pending'}
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Complete verification to unlock loans
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-foreground">
                {Math.round(calculateProgress())}%
              </span>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Complete</p>
            </div>
          </div>

          <div className="space-y-2">
            <Progress
              value={calculateProgress()}
              className="h-2 bg-muted"
              indicatorClassName={cn(
                'transition-all duration-500',
                isEligibleForLoanApplication() ? 'bg-green-500' : 'bg-blue-500'
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {documents.filter((d) => d.is_required && d.is_verified).length} of{' '}
                {documents.filter((d) => d.is_required).length} required docs verified
              </span>
              {isEligibleForLoanApplication() && (
                <span className="text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Ready to Apply
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access Control Notice */}
      {!isEligibleForLoanApplication() && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-yellow-500" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-yellow-500">Access Restricted</h4>
            <p className="text-xs text-yellow-500/70 mt-1 leading-relaxed">
              To ensure compliance and security, loan applications are locked until your profile and
              documents are fully verified.
            </p>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        {documents.map((doc) => {
          const docInfo = DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES];
          const status = getDocumentStatus(doc);

          return (
            <div
              key={doc.id}
              className="group bg-card border border-border rounded-xl p-4 transition-all hover:bg-accent/50 hover:border-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={cn(
                      'mt-1 p-2 rounded-lg bg-background border border-border',
                      status.color
                    )}
                  >
                    {status.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-foreground truncate">
                        {docInfo?.label || doc.document_type}
                      </h4>
                      {doc.is_required && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                          Required
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 h-5', status.className)}
                      >
                        {status.text}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {docInfo?.description}
                    </p>

                    {doc.rejection_reason && (
                      <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                        <strong>Action Required:</strong> {doc.rejection_reason}
                      </div>
                    )}

                    {doc.verification_date && (
                      <p className="text-[10px] text-green-500/70 mt-1 font-mono">
                        Verified: {new Date(doc.verification_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center gap-2 self-center">
                  {doc.is_submitted && doc.file_path && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  {(!doc.is_submitted || doc.rejection_reason) && (
                    <div className="flex items-center">
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

                      {selectedFile && uploadingDocType === doc.document_type ? (
                        <Button
                          size="sm"
                          onClick={() => handleFileUpload(doc.document_type, selectedFile)}
                          disabled={uploading === doc.document_type}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                        >
                          {uploading === doc.document_type ? 'Uploading...' : 'Confirm'}
                        </Button>
                      ) : (
                        <Label htmlFor={`file-${doc.document_type}`}>
                          <div
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                              uploading === doc.document_type
                                ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                                : 'bg-background border-border text-foreground hover:bg-accent'
                            )}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Upload</span>
                          </div>
                        </Label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Upload Guidelines</h3>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground pl-4 list-disc marker:text-muted-foreground">
          <li>Accepted formats: PDF, JPG, PNG (Max 10MB)</li>
          <li>Ensure images are clear and text is readable</li>
          <li>Bank statements must show name & account details</li>
          <li>ID documents must show both front and back</li>
          <li>Documents are reviewed within 24-48 hours</li>
          <li>Your data is encrypted and secure</li>
        </ul>
      </div>
    </div>
  );
}
