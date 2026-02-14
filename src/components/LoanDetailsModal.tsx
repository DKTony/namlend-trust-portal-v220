import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { formatNAD } from '@/utils/currency';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Percent,
  CreditCard,
  Briefcase,
  ShieldCheck,
  Wallet
} from 'lucide-react';

interface LoanRequestData {
  employment_status?: string;
  monthly_income?: number;
  existing_debt?: number;
  credit_score?: string | number;
  user_verified?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface LoanDetailsModalProps {
  open: boolean;
  onClose: () => void;
  loan: {
    id: string;
    amount: number;
    term_months?: number;
    interest_rate: number;
    monthly_payment?: number;
    total_repayment?: number;
    purpose: string;
    status: string;
    created_at: string;
    disbursed_at?: string;
    approved_at?: string;
    request_data?: LoanRequestData;
  } | null;
}

export const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({
  open,
  onClose,
  loan
}) => {
  const { styles } = useTheme();

  if (!loan) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      pending: { className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', icon: <Clock className="h-3 w-3" /> },
      approved: { className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: <CheckCircle className="h-3 w-3" /> },
      disbursed: { className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      active: { className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800', icon: <TrendingUp className="h-3 w-3" /> },
      rejected: { className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800', icon: <AlertCircle className="h-3 w-3" /> },
      completed: { className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700', icon: <CheckCircle className="h-3 w-3" /> }
    };

    const variant = variants[status] || variants.pending;

    return (
      <ThemedBadge className={cn("flex items-center space-x-1.5 px-3 py-1", variant.className)}>
        {variant.icon}
        <span className="capitalize font-medium">{status}</span>
      </ThemedBadge>
    );
  };

  // Parse request data for user-friendly display
  const requestData = loan.request_data || {};
  const employmentStatus = requestData.employment_status || 'Not provided';
  const monthlyIncome = requestData.monthly_income || 0;
  const existingDebt = requestData.existing_debt || 0;
  const creditScore = requestData.credit_score || 'Not assessed';
  const userVerified = requestData.user_verified || false;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 border-border", styles.cardClass)}>
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <FileText className="h-5 w-5 text-blue-500" />
               </div>
               <div>
                 <DialogTitle className={cn("text-xl font-bold tracking-tight", styles.textClass)}>Loan Details</DialogTitle>
                 <p className="text-sm text-muted-foreground font-mono mt-0.5">#{loan.id.slice(0, 8)}</p>
               </div>
            </div>
            {getStatusBadge(loan.status)}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-8">
          {/* Primary Stats - Hero Section */}
          <div className="grid grid-cols-2 gap-4">
            <ThemedCard className="p-5 relative overflow-hidden group shadow-sm hover:shadow-medium transition-shadow">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="flex items-center gap-2 text-muted-foreground mb-2">
                 <DollarSign className="h-4 w-4" />
                 <span className="text-xs font-medium uppercase tracking-wider">Principal</span>
               </div>
               <p className={cn("text-3xl font-bold tracking-tight", styles.textClass)}>{formatNAD(loan.amount)}</p>
            </ThemedCard>
            
            <ThemedCard className="p-5 relative overflow-hidden group shadow-sm hover:shadow-medium transition-shadow">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="flex items-center gap-2 text-muted-foreground mb-2">
                 <CreditCard className="h-4 w-4" />
                 <span className="text-xs font-medium uppercase tracking-wider">Monthly</span>
               </div>
               <p className="text-3xl font-bold text-primary tracking-tight">
                  {loan.monthly_payment ? formatNAD(loan.monthly_payment) : '...'}
               </p>
            </ThemedCard>
          </div>

          {/* Terms Grid - The "Receipt" */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contract Terms
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {[
                { label: 'Term', value: `${loan.term_months || 'N/A'} mo`, icon: Calendar },
                { label: 'Rate', value: `${loan.interest_rate}%`, icon: Percent },
                { label: 'Total', value: loan.total_repayment ? formatNAD(loan.total_repayment) : 'N/A', icon: TrendingUp },
                { label: 'Purpose', value: loan.purpose, icon: FileText, capitalize: true },
              ].map((item, i) => (
                <div key={i} className="bg-card p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                    <item.icon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
                  </div>
                  <p className={cn("text-sm font-semibold", styles.textClass, item.capitalize && "capitalize")}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Applicant Info */}
            <div>
               <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4" />
                Applicant Profile
              </h3>
              <ThemedCard className="p-1 space-y-1">
                 <div className="flex justify-between items-center p-3 hover:bg-accent/50 rounded-xl transition-colors">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                       <Briefcase className="h-3.5 w-3.5" /> Employment
                    </span>
                    <span className={cn("text-sm font-medium capitalize", styles.textClass)}>{employmentStatus}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 hover:bg-accent/50 rounded-xl transition-colors">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                       <Wallet className="h-3.5 w-3.5" /> Income
                    </span>
                    <span className={cn("text-sm font-medium font-mono", styles.textClass)}>{formatNAD(monthlyIncome)}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 hover:bg-accent/50 rounded-xl transition-colors">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                       <ShieldCheck className="h-3.5 w-3.5" /> Credit Score
                    </span>
                    <ThemedBadge variant="secondary">
                      {creditScore}
                    </ThemedBadge>
                 </div>
              </ThemedCard>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Status History
              </h3>
              <div className="relative pl-2 space-y-6">
                 {/* Vertical Line */}
                 <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
                 
                 {[
                   { label: 'Applied', date: loan.created_at, active: true, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                   { label: 'Approved', date: loan.approved_at, active: !!loan.approved_at, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                   { label: 'Disbursed', date: loan.disbursed_at, active: !!loan.disbursed_at, icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
                 ].map((step, i) => (
                   <div key={i} className={cn("relative flex items-center gap-4 group", !step.active && "opacity-40 grayscale")}>
                      <div className={cn(
                        "h-10 w-10 rounded-xl border flex items-center justify-center relative z-10 transition-all duration-300",
                        step.active ? `${step.bg} ${step.border} shadow-lg shadow-black/5 dark:shadow-black/20` : "bg-muted border-border"
                      )}>
                        <step.icon className={cn("h-4 w-4 transition-colors", step.active ? step.color : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className={cn("text-sm font-medium transition-colors", step.active ? styles.textClass : "text-muted-foreground")}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {step.date ? formatDate(step.date) : 'Pending'}
                        </p>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          {/* Metadata Footer */}
          {Object.keys(requestData).length > 0 && (
            <ThemedCard className="p-4">
               <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                 {Object.entries(requestData)
                   .filter(([key]) => !['employment_status', 'monthly_income', 'existing_debt', 'credit_score', 'user_verified'].includes(key))
                   .map(([key, value]) => (
                     <div key={key} className="flex flex-col">
                       <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                       <span className={cn("text-sm font-medium truncate", styles.textClass)}>
                         {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                          typeof value === 'number' ? value.toLocaleString() : 
                          String(value)}
                       </span>
                     </div>
                   ))}
               </div>
            </ThemedCard>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanDetailsModal;
