import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { formatNAD } from '@/utils/currency';
import { BadgeCheck, User, Calendar, DollarSign, FileText, RefreshCw, Search } from 'lucide-react';

interface SettledLoan {
  id: string;
  user_id: string;
  amount: number;
  total_repayment: number;
  total_paid: number;
  term_months: number;
  interest_rate: number;
  purpose: string;
  status: string;
  disbursed_at: string;
  settled_at: string;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const SettledLoansList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Convex reactive queries
  const rawLoans = useQuery(api.loans.adminListLoans, { status: 'paid_off' });
  const rawUsers = useQuery(api.users.listUsers, {});

  const loading = rawLoans === undefined;

  const loans: SettledLoan[] = useMemo(() => {
    if (!rawLoans) return [];
    const userMap = new Map((rawUsers ?? []).map((u: any) => [String(u._id), u]));
    return rawLoans.map((l: any) => {
      const user = userMap.get(String(l.userId)) as
        | { fullName?: string; email?: string }
        | undefined;
      return {
        id: String(l._id),
        user_id: String(l.userId ?? ''),
        amount: l.principal ?? 0,
        total_repayment: l.totalPaid ?? l.principal ?? 0,
        total_paid: l.totalPaid ?? 0,
        term_months: l.termMonths ?? 0,
        interest_rate: l.interestRate ?? 0,
        purpose: l.purpose ?? '',
        status: l.status ?? 'paid_off',
        disbursed_at: l.disbursedAt ? new Date(l.disbursedAt).toISOString() : '',
        settled_at: l.completedAt ? new Date(l.completedAt).toISOString() : '',
        created_at: l.createdAt ? new Date(l.createdAt).toISOString() : '',
        profile: user
          ? {
              first_name: user.fullName?.split(' ')[0] ?? '',
              last_name: user.fullName?.split(' ').slice(1).join(' ') ?? '',
              email: user.email ?? '',
            }
          : undefined,
      };
    });
  }, [rawLoans, rawUsers]);

  const getFullName = (profile?: { first_name: string; last_name: string }) => {
    if (!profile) return 'Unknown Client';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Client';
  };

  const filteredLoans = loans.filter((loan) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const fullName = getFullName(loan.profile);
    return (
      fullName.toLowerCase().includes(search) ||
      loan.profile?.email?.toLowerCase().includes(search) ||
      loan.purpose?.toLowerCase().includes(search) ||
      loan.id.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search by client name, email, or loan ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-teal-500 focus:border-input text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Summary */}
      <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-8 w-8 text-teal-600 dark:text-teal-400" />
              <div>
                <h3 className="font-semibold text-teal-900 dark:text-teal-300">
                  {filteredLoans.length} Settled Loan{filteredLoans.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-teal-700 dark:text-teal-400">
                  Total collected:{' '}
                  {formatNAD(
                    filteredLoans.reduce(
                      (sum, l) => sum + (l.total_paid || l.total_repayment || 0),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
            {/* Convex queries are reactive — data auto-refreshes */}
          </div>
        </CardContent>
      </Card>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BadgeCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Settled Loans</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'No loans match your search criteria'
                  : 'No loans have been fully settled yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLoans.map((loan) => (
            <Card key={loan.id} className="hover:shadow-md transition-shadow bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className="bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 hover:bg-teal-100 shrink-0">
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        Settled
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate tabular-nums">
                        ID: {loan.id.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3 min-w-0">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span
                        className="font-medium truncate text-foreground"
                        title={getFullName(loan.profile)}
                      >
                        {getFullName(loan.profile)}
                      </span>
                      <span
                        className="text-sm text-muted-foreground truncate"
                        title={loan.profile?.email || 'No email'}
                      >
                        ({loan.profile?.email || 'No email'})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="text-muted-foreground truncate">Principal</p>
                        <p
                          className="font-semibold truncate tabular-nums text-foreground"
                          title={formatNAD(loan.amount)}
                        >
                          {formatNAD(loan.amount)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground truncate">Total Paid</p>
                        <p
                          className="font-semibold text-teal-600 dark:text-teal-400 truncate tabular-nums"
                          title={formatNAD(loan.total_paid || loan.total_repayment)}
                        >
                          {formatNAD(loan.total_paid || loan.total_repayment)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground truncate">Disbursed</p>
                        <p className="font-medium truncate tabular-nums text-foreground">
                          {formatDate(loan.disbursed_at)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground truncate">Settled</p>
                        <p className="font-medium text-teal-600 dark:text-teal-400 truncate tabular-nums">
                          {formatDate(loan.settled_at)}
                        </p>
                      </div>
                    </div>

                    {loan.purpose && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate" title={loan.purpose}>
                          {loan.purpose}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SettledLoansList;
