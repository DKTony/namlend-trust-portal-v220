import { cn } from '@/lib/utils';
import { Briefcase, ChevronRight, CreditCard, FileText, ShieldCheck, User } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'personal', label: 'Personal Details', icon: FileText },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'banking', label: 'Banking', icon: CreditCard },
  { id: 'documents', label: 'Documents', icon: ShieldCheck },
] as const;

interface ClientProfileSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function ClientProfileSidebar({
  activeSection,
  onSectionChange,
}: ClientProfileSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSectionChange(tab.id)}
          className={cn(
            'w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group',
            activeSection === tab.id
              ? 'bg-card border-border text-foreground shadow-sm'
              : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-3">
            <tab.icon
              className={cn(
                'h-5 w-5',
                activeSection === tab.id
                  ? 'text-blue-500'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            <span className="font-medium text-sm">{tab.label}</span>
          </div>
          {activeSection === tab.id && <ChevronRight className="h-4 w-4 text-blue-500" />}
        </button>
      ))}
    </div>
  );
}
