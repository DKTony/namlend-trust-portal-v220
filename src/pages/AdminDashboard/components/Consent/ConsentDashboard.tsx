/**
 * POPIA Consent Records Dashboard
 * Admin interface for viewing and auditing consent records.
 * Wired to convex/ontology/consentRecords.ts (listConsents query).
 */

import React, { useState } from 'react';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, RefreshCw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  granted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  withdrawn: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

const STATUSES = ['all', 'granted', 'withdrawn', 'expired'] as const;
const CONSENT_TYPES = [
  'all',
  'data_processing',
  'debit_mandate',
  'credit_check',
  'communication',
  'data_sharing',
] as const;

const ConsentDashboard: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const consents = useConvexQuery(api.ontology.consentRecords.listConsents, {
    ...(statusFilter !== 'all' ? { status: statusFilter as any } : {}),
    ...(typeFilter !== 'all' ? { consentType: typeFilter as any } : {}),
  });

  const loading = consents === undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-sky-500" />
              <div>
                <CardTitle>POPIA Consent Records</CardTitle>
                <CardDescription>
                  Audit trail for data processing consents under the Protection of Personal
                  Information Act.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'all' ? 'All Statuses' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Consent type" />
                </SelectTrigger>
                <SelectContent>
                  {CONSENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === 'all' ? 'All Types' : t.replace(/_/g, ' ')}
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
          ) : !consents || consents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No consent records found</p>
              <p className="text-sm">
                Consent records will appear here as clients grant data processing permissions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Description</th>
                    <th className="pb-3 pr-4 font-medium">Legal Basis</th>
                    <th className="pb-3 pr-4 font-medium">Method</th>
                    <th className="pb-3 pr-4 font-medium">Granted</th>
                    <th className="pb-3 pr-4 font-medium">Expires</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c: any) => (
                    <tr key={c._id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-4 capitalize">{c.consentType?.replace(/_/g, ' ')}</td>
                      <td className="py-3 pr-4 max-w-xs truncate" title={c.description}>
                        {c.description}
                      </td>
                      <td className="py-3 pr-4 text-xs font-mono">{c.legalBasis || '—'}</td>
                      <td className="py-3 pr-4 capitalize text-xs">
                        {c.collectionMethod?.replace(/_/g, ' ') || '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {c.grantedAt ? new Date(c.grantedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className={STATUS_COLORS[c.status] || ''}>
                          {c.status}
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

export default ConsentDashboard;
