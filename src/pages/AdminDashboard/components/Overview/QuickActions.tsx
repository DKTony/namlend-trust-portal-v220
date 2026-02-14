import React from 'react';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { 
  FileText, 
  Users, 
  CreditCard, 
  Settings, 
  Download, 
  AlertCircle,
  Plus,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  badge?: string;
}

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { styles } = useTheme();

  const quickActions: QuickAction[] = [
    {
      title: 'Review Pending Loans',
      description: 'Process loan applications awaiting approval',
      icon: FileText,
      action: () => navigate('/admin/loans?status=pending'),
      badge: '5'
    },
    {
      title: 'View All Clients',
      description: 'Manage client profiles and accounts',
      icon: Users,
      action: () => navigate('/admin/clients')
    },
    {
      title: 'Payment Management',
      description: 'Track payments and collections',
      icon: CreditCard,
      action: () => navigate('/admin/payments')
    },
    {
      title: 'Generate Reports',
      description: 'Create financial and performance reports',
      icon: Download,
      action: () => navigate('/admin/reports')
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      action: () => navigate('/admin/settings')
    },
    {
      title: 'Risk Assessment',
      description: 'Review high-risk applications',
      icon: AlertCircle,
      action: () => navigate('/admin/risk-assessment'),
      variant: 'secondary',
      badge: '2'
    }
  ];

  return (
    <ThemedCard>
      <div className="mb-6">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", styles.textClass)}>
          <Plus className="h-5 w-5" />
          Quick Actions
        </h3>
        <p className="text-sm text-muted-foreground">
          Common administrative tasks and shortcuts
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <ThemedButton
              key={index}
              variant={action.variant || 'secondary'}
              className="h-auto p-4 flex items-start justify-start text-left relative overflow-hidden hover:shadow-md transition-all duration-200"
              onClick={action.action}
            >
              {action.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-sm z-10">
                  {action.badge}
                </span>
              )}
              <div className="flex items-start space-x-3 w-full min-h-[60px]">
                <div className="flex-shrink-0 mt-0.5 text-foreground/80">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-sm leading-tight mb-1 truncate", styles.textClass)} title={action.title}>
                    {action.title}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-normal" title={action.description}>
                    {action.description}
                  </div>
                </div>
              </div>
            </ThemedButton>
          );
        })}
      </div>
      
      {/* Additional Action Buttons */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex flex-wrap gap-2 justify-start">
          <ThemedButton variant="ghost" className="text-xs px-3 py-2 h-auto rounded-lg">
            <Eye className="h-3 w-3 mr-1.5" />
            View Analytics
          </ThemedButton>
          <ThemedButton variant="ghost" className="text-xs px-3 py-2 h-auto rounded-lg">
            <Download className="h-3 w-3 mr-1.5" />
            Export Data
          </ThemedButton>
          <ThemedButton variant="ghost" className="text-xs px-3 py-2 h-auto rounded-lg">
            <Settings className="h-3 w-3 mr-1.5" />
            Preferences
          </ThemedButton>
        </div>
      </div>
    </ThemedCard>
  );
};

export default QuickActions;
