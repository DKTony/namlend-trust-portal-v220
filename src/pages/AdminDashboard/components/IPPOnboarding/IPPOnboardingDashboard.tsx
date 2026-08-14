/**
 * IPP Onboarding Dashboard — staff view of live Convex onboarding applications.
 * Clients start onboarding from the Banking surface; this page does not invent rows.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/integrations/convex/api';
import {
  IPP_ONBOARDING_STATE_COLORS,
  IPP_ONBOARDING_STATE_LABELS,
  getIPPOnboardingProgress,
  type IPPOnboardingState,
} from '@/types/ips';
import { useQuery } from 'convex/react';
import { AlertCircle, CheckCircle2, Clock, Loader2, Users } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

function StatCard({
  title,
  value,
  icon,
  description,
  color = 'blue',
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
  description?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-50 text-gray-700',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function IPPOnboardingDashboard() {
  const applications = useQuery(api.ips.ipsOnboarding.adminListOnboarding, {});
  const [searchTerm, setSearchTerm] = useState('');

  const rows = applications ?? [];
  const stats = useMemo(() => {
    const ready = rows.filter((row) => row.status === 'READY_FOR_IPP_PAYMENTS').length;
    const errors = rows.filter(
      (row) => row.status === 'SUSPENDED' || row.status === 'DEREGISTERED'
    ).length;
    const inProgress = rows.length - ready - errors;
    return {
      total: rows.length,
      ready,
      inProgress: Math.max(inProgress, 0),
      errors,
    };
  }, [rows]);

  const filtered = rows.filter((row) => {
    if (!searchTerm) return true;
    const haystack = `${row.userId} ${row.status}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6" data-testid="ipp-onboarding-dashboard">
      <div>
        <h2 className="text-2xl font-bold text-foreground">IPP Onboarding</h2>
        <p className="text-muted-foreground">
          Live IPS onboarding applications for this tenant. Clients enroll from Banking.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Applications" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard
          title="IPP Ready"
          value={stats.ready}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<Clock className="h-5 w-5" />}
          color="yellow"
        />
        <StatCard
          title="Suspended / closed"
          value={stats.errors}
          icon={<AlertCircle className="h-5 w-5" />}
          color="red"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding applications</CardTitle>
          <CardDescription>
            {applications === undefined
              ? 'Loading live Convex records…'
              : `${filtered.length} application${filtered.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Filter by user id or status"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          {applications === undefined ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No onboarding applications yet. Entitled clients start this flow from Banking.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const state = row.status as IPPOnboardingState;
                  const progress = getIPPOnboardingProgress(state);
                  return (
                    <TableRow key={row._id}>
                      <TableCell className="font-mono text-xs">{row.userId}</TableCell>
                      <TableCell>
                        <Badge className={IPP_ONBOARDING_STATE_COLORS[state] ?? ''}>
                          {IPP_ONBOARDING_STATE_LABELS[state] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{progress}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.updatedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default IPPOnboardingDashboard;
