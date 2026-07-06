/**
 * Mandates Dashboard
 * Admin interface for viewing debit mandates.
 * Wired to convex/ontology/mandates.ts (listMandates query).
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNAD } from '@/utils/currency';
import { api } from '@/integrations/convex/api';
import { useQuery as useConvexQuery } from 'convex/react';
import { FileSignature, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  pending_authorization: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

const STATUSES = [
  'all',
  'draft',
  'pending_authorization',
  'active',
  'suspended',
  'revoked',
  'expired',
] as const;

const MandatesDashboard: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const mandates = useConvexQuery(
    api.ontology.mandates.listMandates,
    statusFilter === 'all' ? {} : { status: statusFilter as any }
  );

  const loading = mandates === undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSignature className="h-6 w-6 text-sky-500" />
              <div>
                <CardTitle>Debit Mandates</CardTitle>
                <CardDescription>
                  Manage debit order authorizations and recurring collection mandates.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !mandates || mandates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No mandates found</p>
              <p className="text-sm">
                Mandates will appear here when clients authorize debit orders.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Reference</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Debtor</th>
                    <th className="pb-3 pr-4 font-medium">Creditor</th>
                    <th className="pb-3 pr-4 font-medium text-right">Amount</th>
                    <th className="pb-3 pr-4 font-medium">Frequency</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mandates.map((m: any) => (
                    <tr key={m._id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-4 font-mono text-xs">{m.mandateRef}</td>
                      <td className="py-3 pr-4 capitalize">{m.mandateType?.replace(/_/g, ' ')}</td>
                      <td className="py-3 pr-4">{m.debtorName || '—'}</td>
                      <td className="py-3 pr-4">{m.creditorName || '—'}</td>
                      <td className="py-3 pr-4 text-right font-mono">{formatNAD(m.amount)}</td>
                      <td className="py-3 pr-4 capitalize">{m.frequency || '—'}</td>
                      <td className="py-3">
                        <Badge variant="secondary" className={STATUS_COLORS[m.status] || ''}>
                          {m.status?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MandatesDashboard;
