import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  badge?: string;
}

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

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
      variant: 'outline' as const,
      badge: '2'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Common administrative tasks and shortcuts
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                className="h-auto p-4 flex items-start justify-start text-left relative overflow-hidden hover:shadow-md transition-all duration-200"
                onClick={action.action}
              >
                {action.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-sm z-10">
                    {action.badge}
                  </span>
                )}
                <div className="flex items-start space-x-3 w-full min-h-[60px]">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight mb-1 truncate">
                      {action.title}
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
        
        {/* Additional Action Buttons */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 justify-start">
            <Button size="sm" variant="ghost" className="text-xs hover:bg-gray-100 px-3 py-2">
              <Eye className="h-3 w-3 mr-1.5" />
              View Analytics
            </Button>
            <Button size="sm" variant="ghost" className="text-xs hover:bg-gray-100 px-3 py-2">
              <Download className="h-3 w-3 mr-1.5" />
              Export Data
            </Button>
            <Button size="sm" variant="ghost" className="text-xs hover:bg-gray-100 px-3 py-2">
              <Settings className="h-3 w-3 mr-1.5" />
              Preferences
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
