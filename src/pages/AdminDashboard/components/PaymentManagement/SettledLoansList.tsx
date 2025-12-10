import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatNAD } from '@/utils/currency';
import { 
  BadgeCheck, 
  User, 
  Calendar, 
  DollarSign,
  FileText,
  RefreshCw,
  Search
} from 'lucide-react';

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
  const [loans, setLoans] = useState<SettledLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSettledLoans = async () => {
    setLoading(true);
    try {
      // Fetch settled loans
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .eq('status', 'settled')
        .order('settled_at', { ascending: false });

      if (loansError) {
        console.error('Error fetching settled loans:', loansError);
        return;
      }

      if (!loansData || loansData.length === 0) {
        setLoans([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(loansData.map(l => l.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of user_id to profile
      const profileMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Combine loans with profiles
      const loansWithProfiles = loansData.map(loan => ({
        ...loan,
        profile: profileMap.get(loan.user_id) || undefined
      }));

      setLoans(loansWithProfiles);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettledLoans();
  }, []);

  const getFullName = (profile?: { first_name: string; last_name: string }) => {
    if (!profile) return 'Unknown Client';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Client';
  };

  const filteredLoans = loans.filter(loan => {
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
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search by client name, email, or loan ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Summary */}
      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-8 w-8 text-teal-600" />
              <div>
                <h3 className="font-semibold text-teal-900">
                  {filteredLoans.length} Settled Loan{filteredLoans.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-teal-700">
                  Total collected: {formatNAD(filteredLoans.reduce((sum, l) => sum + (l.total_paid || l.total_repayment || 0), 0))}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSettledLoans}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BadgeCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Settled Loans</h3>
              <p className="text-gray-500">
                {searchTerm ? 'No loans match your search criteria' : 'No loans have been fully settled yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLoans.map((loan) => (
            <Card key={loan.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        Settled
                      </Badge>
                      <span className="text-xs text-gray-500">
                        ID: {loan.id.slice(0, 8)}...
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{getFullName(loan.profile)}</span>
                      <span className="text-sm text-gray-500">({loan.profile?.email || 'No email'})</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Principal</p>
                        <p className="font-semibold">{formatNAD(loan.amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Paid</p>
                        <p className="font-semibold text-teal-600">{formatNAD(loan.total_paid || loan.total_repayment)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Disbursed</p>
                        <p className="font-medium">{formatDate(loan.disbursed_at)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Settled</p>
                        <p className="font-medium text-teal-600">{formatDate(loan.settled_at)}</p>
                      </div>
                    </div>

                    {loan.purpose && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        <span>{loan.purpose}</span>
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
