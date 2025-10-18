import { useState, useEffect } from 'react';

interface SupportTicket {
  id: string;
  clientId: string;
  clientName: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'loan' | 'account' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  responseTime?: number; // in hours
  resolutionTime?: number; // in hours
}

export const useSupportTickets = (filter: string, searchTerm: string) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for support tickets - in real implementation, this would fetch from Supabase
      const mockTickets: SupportTicket[] = [
        {
          id: 'ticket-001',
          clientId: 'client-1',
          clientName: 'John Doe',
          subject: 'Unable to access loan dashboard',
          description: 'I am unable to log into my account and view my loan status. Getting error message "Invalid credentials" even with correct password.',
          category: 'technical',
          priority: 'high',
          status: 'open',
          assignedTo: 'Tech Support Team',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          responseTime: 0.5
        },
        {
          id: 'ticket-002',
          clientId: 'client-2',
          clientName: 'Jane Smith',
          subject: 'Incorrect payment amount charged',
          description: 'My monthly payment was charged N$2,800 instead of the agreed N$2,500. Please investigate and refund the difference.',
          category: 'billing',
          priority: 'urgent',
          status: 'in-progress',
          assignedTo: 'Billing Department',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          responseTime: 1.2
        },
        {
          id: 'ticket-003',
          clientId: 'client-3',
          clientName: 'Michael Johnson',
          subject: 'Loan application status inquiry',
          description: 'It has been 2 weeks since I submitted my loan application. Could you please provide an update on the approval status?',
          category: 'loan',
          priority: 'medium',
          status: 'resolved',
          assignedTo: 'Loan Officer',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          responseTime: 2.5,
          resolutionTime: 18
        },
        {
          id: 'ticket-004',
          clientId: 'client-4',
          clientName: 'Sarah Wilson',
          subject: 'Request to update personal information',
          description: 'I need to update my phone number and address in my profile. The current information is outdated.',
          category: 'account',
          priority: 'low',
          status: 'closed',
          assignedTo: 'Customer Service',
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          responseTime: 4,
          resolutionTime: 36
        },
        {
          id: 'ticket-005',
          clientId: 'client-5',
          clientName: 'David Brown',
          subject: 'General inquiry about loan terms',
          description: 'I would like to understand the different loan products available and their respective interest rates and terms.',
          category: 'general',
          priority: 'low',
          status: 'open',
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'ticket-006',
          clientId: 'client-6',
          clientName: 'Lisa Anderson',
          subject: 'Mobile app crashes on payment screen',
          description: 'The mobile app crashes every time I try to make a payment. This is preventing me from making my monthly payment on time.',
          category: 'technical',
          priority: 'urgent',
          status: 'in-progress',
          assignedTo: 'Mobile Dev Team',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          responseTime: 1
        }
      ];

      // Apply filters
      let filteredTickets = mockTickets;

      // Status filter
      if (filter !== 'all') {
        if (filter === 'urgent') {
          filteredTickets = filteredTickets.filter(ticket => ticket.priority === 'urgent');
        } else {
          filteredTickets = filteredTickets.filter(ticket => ticket.status === filter);
        }
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredTickets = filteredTickets.filter(ticket =>
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.clientName.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower) ||
          ticket.id.toLowerCase().includes(searchLower)
        );
      }

      // Sort by priority (urgent first) and then by creation date (most recent first)
      filteredTickets.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setTickets(filteredTickets);
    } catch (err) {
      console.error('Error fetching support tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter, searchTerm]);

  return { tickets, loading, error, refetch: fetchTickets };
};
