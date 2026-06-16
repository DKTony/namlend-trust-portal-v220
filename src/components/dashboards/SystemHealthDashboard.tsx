import { Badge } from '@/components/ui/badge';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { errorMonitor } from '@/utils/errorMonitoring';
import { AlertTriangle, CheckCircle, Clock, Database, Shield, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface SystemHealthProps {
  isAdmin?: boolean;
}

const SystemHealthDashboard: React.FC<SystemHealthProps> = ({ isAdmin = false }) => {
  const [healthStatus, setHealthStatus] = useState<{
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
  }>({ status: 'healthy', issues: [] });

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkHealth = () => {
      const health = errorMonitor.getSystemHealth();
      setHealthStatus(health);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'degraded':
        return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'degraded':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
    }
  };

  if (!isAdmin && healthStatus.status === 'healthy') {
    return null; // Don't show to non-admins when system is healthy
  }

  return (
    <ThemedCard className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>System Status</span>
            <Badge className={getStatusColor()}>{healthStatus.status.toUpperCase()}</Badge>
          </div>
          {isAdmin && (
            <ThemedButton variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide' : 'Details'}
            </ThemedButton>
          )}
        </CardTitle>
      </CardHeader>

      {healthStatus.issues.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {healthStatus.issues.map((issue, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>{issue}</span>
              </div>
            ))}
          </div>

          {healthStatus.status === 'critical' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 text-sm text-red-800">
                <Database className="h-4 w-4" />
                <span>Critical system issues detected. Please run the SQL fixes in Supabase:</span>
              </div>
              <div className="mt-2 text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
                sql/fix_critical_errors.sql
              </div>
            </div>
          )}
        </CardContent>
      )}

      {showDetails && isAdmin && (
        <CardContent className="pt-0 border-t">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span>Database</span>
                <Badge variant="outline" className="text-xs">
                  {healthStatus.status === 'critical' ? 'Error' : 'OK'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Authentication</span>
                <Badge variant="outline" className="text-xs">
                  Fixed
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Performance</span>
                <Badge variant="outline" className="text-xs">
                  Monitoring
                </Badge>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Last checked: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      )}
    </ThemedCard>
  );
};

export default SystemHealthDashboard;
