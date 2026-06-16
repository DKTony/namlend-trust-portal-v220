import { Button } from '@/components/ui/button';
import { formatNAD } from '@/utils/currency';
import { Building, Edit } from 'lucide-react';

interface EmploymentSectionProps {
  profile: {
    employment_status: string;
    monthly_income: number;
    employer_name: string;
    employer_phone: string;
    employer_contact_person: string;
  };
  isEditing: boolean;
  editForm: Record<string, any>;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onInputChange: (field: string, value: any) => void;
}

export function EmploymentSection({
  profile,
  isEditing,
  editForm,
  onEditStart,
  onEditCancel,
  onEditSave,
  onInputChange,
}: EmploymentSectionProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-500" />
          Employment Details
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
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Employment Status
          </label>
          {isEditing ? (
            <select
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
              value={editForm.employment_status || ''}
              onChange={(e) => onInputChange('employment_status', e.target.value)}
            >
              <option value="">Select Status</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="retired">Retired</option>
              <option value="student">Student</option>
            </select>
          ) : (
            <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg capitalize">
              {profile.employment_status || (
                <span className="text-muted-foreground italic">Not provided</span>
              )}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Monthly Income
          </label>
          {isEditing ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                className="w-full bg-background border border-border rounded-lg pl-8 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={editForm.monthly_income || ''}
                onChange={(e) => onInputChange('monthly_income', parseFloat(e.target.value) || 0)}
              />
            </div>
          ) : (
            <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg font-mono">
              {profile.monthly_income ? (
                formatNAD(profile.monthly_income)
              ) : (
                <span className="text-muted-foreground italic">Not provided</span>
              )}
            </p>
          )}
        </div>
        {[
          { label: 'Employer Name', field: 'employer_name', value: profile.employer_name },
          { label: 'Employer Phone', field: 'employer_phone', value: profile.employer_phone },
          {
            label: 'Contact Person',
            field: 'employer_contact_person',
            value: profile.employer_contact_person,
          },
        ].map((item) => (
          <div key={item.field} className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {item.label}
            </label>
            {isEditing ? (
              <input
                type="text"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={editForm[item.field] || ''}
                onChange={(e) => onInputChange(item.field, e.target.value)}
              />
            ) : (
              <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg">
                {item.value || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
