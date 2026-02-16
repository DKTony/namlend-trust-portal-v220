import { Button } from '@/components/ui/button';
import { CreditCard, Edit, Wallet } from 'lucide-react';

interface BankingSectionProps {
  profile: {
    first_name: string;
    last_name: string;
    bank_name: string;
    account_number: string;
    branch_code: string;
    branch_name: string;
  };
  isEditing: boolean;
  editForm: Record<string, any>;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onInputChange: (field: string, value: any) => void;
}

export function BankingSectionProfile({
  profile,
  isEditing,
  editForm,
  onEditStart,
  onEditCancel,
  onEditSave,
  onInputChange,
}: BankingSectionProps) {
  const fields = [
    { label: 'Bank Name', field: 'bank_name', value: profile.bank_name },
    { label: 'Account Number', field: 'account_number', value: profile.account_number },
    { label: 'Branch Code', field: 'branch_code', value: profile.branch_code },
    { label: 'Branch Name', field: 'branch_name', value: profile.branch_name },
  ] as const;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-500" />
          Banking Information
        </h3>
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onEditSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onEditStart}
            className="border-border bg-background hover:bg-accent text-foreground"
          >
            <Edit className="h-3.5 w-3.5 mr-2" /> Edit
          </Button>
        )}
      </div>
      <div className="p-6">
        {/* Visual Credit Card */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700/50 shadow-xl max-w-sm relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <CreditCard className="h-32 w-32" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <p className="font-bold text-zinc-400 text-sm tracking-widest truncate pr-8">
                {profile.bank_name || 'BANK NAME'}
              </p>
              <Wallet className="h-6 w-6 text-zinc-500 shrink-0" />
            </div>
            <div>
              <p className="font-mono text-xl text-white tracking-widest mb-2 truncate">
                {profile.account_number
                  ? `**** **** **** ${profile.account_number.slice(-4)}`
                  : '**** **** **** ****'}
              </p>
              <p className="text-xs text-zinc-500 uppercase truncate">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((item) => (
            <div key={item.field} className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {item.label}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={(editForm[item.field] as string) || ''}
                  onChange={(e) => onInputChange(item.field, e.target.value)}
                />
              ) : (
                <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg truncate">
                  {item.value || <span className="text-muted-foreground italic">Not provided</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
