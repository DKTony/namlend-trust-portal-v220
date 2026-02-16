import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle, AlertCircle, FileText, Upload, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentRequirement {
  id: string;
  document_type: string;
  is_required: boolean;
  is_submitted: boolean;
  is_verified: boolean;
}

interface DocumentsSectionProps {
  documentRequirements: DocumentRequirement[];
  isEligible: boolean;
}

export function DocumentsSection({ documentRequirements, isEligible }: DocumentsSectionProps) {
  const getStatusText = (doc: DocumentRequirement) => {
    if (doc.is_verified) return 'Verified';
    if (doc.is_submitted) return 'Under Review';
    return 'Required';
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-500" />
          Document Verification
        </h3>
        <Button
          size="sm"
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
        >
          <Upload className="h-3.5 w-3.5 mr-2" /> Upload New
        </Button>
      </div>
      <div className="p-6 space-y-4">
        {documentRequirements.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl hover:border-muted-foreground/30 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center bg-background border border-border',
                  doc.is_verified
                    ? 'text-green-500'
                    : doc.is_submitted
                      ? 'text-yellow-500'
                      : 'text-muted-foreground'
                )}
              >
                {doc.is_verified ? (
                  <CheckCircle className="h-5 w-5" />
                ) : doc.is_submitted ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground capitalize">
                  {doc.document_type.replace(/_/g, ' ')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 border-0 rounded-md',
                      doc.is_verified
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : doc.is_submitted
                          ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    )}
                  >
                    {getStatusText(doc)}
                  </Badge>
                  {doc.is_required && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-sm">
                      Required
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {doc.is_submitted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Eye className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 text-xs bg-background border-border text-foreground hover:bg-accent px-4"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                </Button>
              )}
            </div>
          </div>
        ))}
        {!isEligible && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-1">
                Incomplete Profile
              </p>
              <p className="text-xs text-yellow-600/80 dark:text-yellow-500/70">
                Please upload all required documents marked with "Required" to unlock loan
                applications.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
