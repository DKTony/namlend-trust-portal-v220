import { Button } from '@/components/ui/button';
import { Edit, MapPin, User } from 'lucide-react';

interface PersonalSectionProps {
  profile: {
    first_name: string;
    last_name: string;
    id_number: string;
    phone_number: string;
  };
  email?: string;
  isEditing: boolean;
  editForm: Record<string, any>;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onInputChange: (field: string, value: any) => void;
}

export function PersonalSection({
  profile,
  email,
  isEditing,
  editForm,
  onEditStart,
  onEditCancel,
  onEditSave,
  onInputChange,
}: PersonalSectionProps) {
  const fields = [
    { label: 'First Name', field: 'first_name', value: profile.first_name },
    { label: 'Last Name', field: 'last_name', value: profile.last_name },
    { label: 'ID Number', field: 'id_number', value: profile.id_number },
    { label: 'Phone Number', field: 'phone_number', value: profile.phone_number },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-blue-500" />
          Personal Information
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
        {fields.map((item) => (
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
              <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg border border-transparent">
                {item.value || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            )}
          </div>
        ))}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Email
          </label>
          <p className="text-foreground font-medium p-2.5 bg-muted/30 rounded-lg border border-transparent opacity-60 cursor-not-allowed">
            {email}
          </p>
        </div>
      </div>
      <div className="px-6 py-4 bg-muted/30 border-t border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" /> Address details managed separately.
        </p>
      </div>
    </div>
  );
}
