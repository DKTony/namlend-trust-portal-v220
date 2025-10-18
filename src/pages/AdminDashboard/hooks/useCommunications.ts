import { useState, useEffect } from 'react';

interface Communication {
  id: string;
  clientId: string;
  clientName: string;
  type: 'email' | 'sms' | 'call' | 'in-app';
  subject: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const useCommunications = (filter: string, searchTerm: string) => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for communications - in real implementation, this would fetch from Supabase
      const mockCommunications: Communication[] = [
        {
          id: '1',
          clientId: 'client-1',
          clientName: 'John Doe',
          type: 'email',
          subject: 'Loan Application Status Update',
          message: 'Your loan application has been approved and is ready for disbursement.',
          status: 'delivered',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        },
        {
          id: '2',
          clientId: 'client-2',
          clientName: 'Jane Smith',
          type: 'sms',
          subject: 'Payment Reminder',
          message: 'Your loan payment of N$2,500 is due tomorrow. Please ensure sufficient funds.',
          status: 'sent',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          priority: 'medium'
        },
        {
          id: '3',
          clientId: 'client-3',
          clientName: 'Michael Johnson',
          type: 'email',
          subject: 'KYC Document Verification Required',
          message: 'Please upload your updated proof of income to complete your profile verification.',
          status: 'read',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          priority: 'urgent'
        },
        {
          id: '4',
          clientId: 'client-4',
          clientName: 'Sarah Wilson',
          type: 'call',
          subject: 'Loan Consultation Call',
          message: 'Follow-up call regarding your loan application and available options.',
          status: 'replied',
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
          priority: 'low'
        },
        {
          id: '5',
          clientId: 'client-5',
          clientName: 'David Brown',
          type: 'in-app',
          subject: 'Welcome to NamLend',
          message: 'Welcome to NamLend! Your account has been successfully created.',
          status: 'delivered',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          priority: 'low'
        }
      ];

      // Apply filters
      let filteredCommunications = mockCommunications;

      // Type filter
      if (filter !== 'all') {
        if (filter === 'pending') {
          filteredCommunications = filteredCommunications.filter(comm => comm.status === 'sent');
        } else {
          filteredCommunications = filteredCommunications.filter(comm => comm.type === filter);
        }
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredCommunications = filteredCommunications.filter(comm =>
          comm.subject.toLowerCase().includes(searchLower) ||
          comm.clientName.toLowerCase().includes(searchLower) ||
          comm.message.toLowerCase().includes(searchLower)
        );
      }

      // Sort by creation date (most recent first)
      filteredCommunications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setCommunications(filteredCommunications);
    } catch (err) {
      console.error('Error fetching communications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch communications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, [filter, searchTerm]);

  return { communications, loading, error, refetch: fetchCommunications };
};
