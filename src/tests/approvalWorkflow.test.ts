import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  submitApprovalRequest, 
  fetchApprovalRequests, 
  updateApprovalStatus, 
  fetchApprovalNotifications,
  markNotificationAsRead,
  processApprovedLoan,
  processApprovedKYC,
  fetchApprovalStatistics
} from '../services/approvalWorkflow';
import { supabase } from '../integrations/supabase/client';

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('Approval Workflow Service', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  const mockApprovalRequest = {
    id: 'test-request-id',
    user_id: 'test-user-id',
    request_type: 'loan_application',
    status: 'pending',
    priority: 'normal',
    request_data: {
      amount: 10000,
      term: 12,
      purpose: 'business'
    },
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth user
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('submitApprovalRequest', () => {
    it('should submit a loan application approval request', async () => {
      const mockRpcResponse = {
        data: { request_id: 'new-request-id' },
        error: null
      };

      (supabase.rpc as any).mockResolvedValue(mockRpcResponse);

      const result = await submitApprovalRequest(
        'loan_application',
        { amount: 10000, term: 12 },
        'normal'
      );

      expect(supabase.rpc).toHaveBeenCalledWith('submit_approval_request', {
        p_request_type: 'loan_application',
        p_request_data: { amount: 10000, term: 12 },
        p_priority: 'normal'
      });

      expect(result).toEqual({ request_id: 'new-request-id' });
    });

    it('should handle submission errors', async () => {
      const mockError = new Error('Database error');
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(
        submitApprovalRequest('loan_application', {}, 'normal')
      ).rejects.toThrow('Database error');
    });

    it('should handle unauthenticated user', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(
        submitApprovalRequest('loan_application', {}, 'normal')
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('fetchApprovalRequests', () => {
    it('should fetch approval requests with filters', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockApprovalRequest],
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await fetchApprovalRequests({
        status: 'pending',
        request_type: 'loan_application',
        limit: 10
      });

      expect(supabase.from).toHaveBeenCalledWith('approval_requests');
      expect(mockFromChain.eq).toHaveBeenCalledWith('status', 'pending');
      expect(mockFromChain.eq).toHaveBeenCalledWith('request_type', 'loan_application');
      expect(mockFromChain.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockApprovalRequest]);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Fetch error');
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      await expect(fetchApprovalRequests()).rejects.toThrow('Fetch error');
    });
  });

  describe('updateApprovalStatus', () => {
    it('should update approval status successfully', async () => {
      const mockFromChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ ...mockApprovalRequest, status: 'approved' }],
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await updateApprovalStatus(
        'test-request-id',
        'approved',
        'Loan meets all criteria'
      );

      expect(supabase.from).toHaveBeenCalledWith('approval_requests');
      expect(mockFromChain.update).toHaveBeenCalledWith({
        status: 'approved',
        admin_notes: 'Loan meets all criteria',
        reviewed_at: expect.any(String)
      });
      expect(mockFromChain.eq).toHaveBeenCalledWith('id', 'test-request-id');
      expect(result.status).toBe('approved');
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Update error');
      const mockFromChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      await expect(
        updateApprovalStatus('test-request-id', 'approved')
      ).rejects.toThrow('Update error');
    });
  });

  describe('fetchApprovalNotifications', () => {
    it('should fetch notifications for admin user', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          approval_request_id: 'request-1',
          notification_type: 'new_request',
          message: 'New loan application submitted',
          is_read: false,
          sent_at: new Date().toISOString()
        }
      ];

      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockNotifications,
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await fetchApprovalNotifications();

      expect(supabase.from).toHaveBeenCalledWith('approval_notifications');
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('processApprovedLoan', () => {
    it('should process approved loan application', async () => {
      const mockLoanData = {
        amount: 10000,
        term: 12,
        purpose: 'business',
        interest_rate: 15
      };

      const mockFromChain = {
        insert: vi.fn().mockResolvedValue({
          data: [{ id: 'new-loan-id' }],
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await processApprovedLoan('test-user-id', mockLoanData);

      expect(supabase.from).toHaveBeenCalledWith('loans');
      expect(mockFromChain.insert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        amount: 10000,
        term_months: 12,
        purpose: 'business',
        interest_rate: 15,
        status: 'approved',
        approved_at: expect.any(String)
      });
      expect(result).toEqual([{ id: 'new-loan-id' }]);
    });

    it('should handle loan processing errors', async () => {
      const mockError = new Error('Loan processing error');
      const mockFromChain = {
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      await expect(
        processApprovedLoan('test-user-id', {})
      ).rejects.toThrow('Loan processing error');
    });
  });

  describe('processApprovedKYC', () => {
    it('should process approved KYC documents', async () => {
      const mockKYCData = {
        document_type: 'national_id',
        document_url: 'https://example.com/doc.pdf',
        verification_status: 'verified'
      };

      const mockFromChain = {
        upsert: vi.fn().mockResolvedValue({
          data: [{ id: 'kyc-id' }],
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await processApprovedKYC('test-user-id', mockKYCData);

      expect(supabase.from).toHaveBeenCalledWith('kyc_documents');
      expect(mockFromChain.upsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        document_type: 'national_id',
        document_url: 'https://example.com/doc.pdf',
        verification_status: 'verified',
        verified_at: expect.any(String)
      });
      expect(result).toEqual([{ id: 'kyc-id' }]);
    });
  });

  describe('fetchApprovalStatistics', () => {
    it('should fetch approval statistics', async () => {
      const mockStats = {
        total_requests: 25,
        pending_requests: 8,
        approved_requests: 15,
        rejected_requests: 2,
        avg_processing_time: '2.5 days'
      };

      (supabase.rpc as any).mockResolvedValue({
        data: mockStats,
        error: null
      });

      const result = await fetchApprovalStatistics();

      expect(supabase.rpc).toHaveBeenCalledWith('get_approval_statistics');
      expect(result).toEqual(mockStats);
    });

    it('should handle statistics fetch errors', async () => {
      const mockError = new Error('Statistics error');
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(fetchApprovalStatistics()).rejects.toThrow('Statistics error');
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const mockFromChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'notif-1', is_read: true }],
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await markNotificationAsRead('notif-1');

      expect(supabase.from).toHaveBeenCalledWith('approval_notifications');
      expect(mockFromChain.update).toHaveBeenCalledWith({
        is_read: true,
        read_at: expect.any(String)
      });
      expect(mockFromChain.eq).toHaveBeenCalledWith('id', 'notif-1');
      expect(result).toEqual([{ id: 'notif-1', is_read: true }]);
    });
  });
});

describe('Approval Workflow Integration Tests', () => {
  it('should handle complete loan approval workflow', async () => {
    // Mock the entire workflow
    const mockRpcResponse = { data: { request_id: 'request-123' }, error: null };
    const mockUpdateResponse = { 
      data: [{ id: 'request-123', status: 'approved' }], 
      error: null 
    };
    const mockLoanResponse = { data: [{ id: 'loan-456' }], error: null };

    (supabase.rpc as any).mockResolvedValue(mockRpcResponse);
    
    const mockFromChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue(mockUpdateResponse),
      insert: vi.fn().mockResolvedValue(mockLoanResponse)
    };

    (supabase.from as any).mockReturnValue(mockFromChain);

    // Submit request
    const submitResult = await submitApprovalRequest(
      'loan_application',
      { amount: 15000, term: 24 },
      'high'
    );

    expect(submitResult.request_id).toBe('request-123');

    // Update status
    const updateResult = await updateApprovalStatus(
      'request-123',
      'approved',
      'Approved after review'
    );

    expect(updateResult.status).toBe('approved');

    // Process loan
    const processResult = await processApprovedLoan('test-user-id', {
      amount: 15000,
      term: 24,
      interest_rate: 18
    });

    expect(processResult).toEqual([{ id: 'loan-456' }]);
  });

  it('should handle rejection workflow', async () => {
    const mockUpdateResponse = { 
      data: [{ id: 'request-123', status: 'rejected' }], 
      error: null 
    };

    const mockFromChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue(mockUpdateResponse)
    };

    (supabase.from as any).mockReturnValue(mockFromChain);

    const result = await updateApprovalStatus(
      'request-123',
      'rejected',
      'Insufficient income verification'
    );

    expect(result.status).toBe('rejected');
    expect(supabase.from).toHaveBeenCalledWith('approval_requests');
  });
});
