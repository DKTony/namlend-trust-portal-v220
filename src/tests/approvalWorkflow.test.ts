import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules that use browser APIs before they are imported
vi.mock('../utils/debug', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
  debugWarn: vi.fn(),
}));

vi.mock('../utils/errorHandler', () => ({
  handleDatabaseError: vi.fn(),
  handleBusinessLogicError: vi.fn(),
  measurePerformance: vi.fn((_name: string, fn: () => Promise<any>) => fn()),
  trackUserAction: vi.fn(),
  errorLogger: { logError: vi.fn() },
  ErrorSeverity: { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' },
  ErrorCategory: { DATABASE: 'database', SYSTEM: 'system', BUSINESS_LOGIC: 'business_logic' },
}));

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

import {
  submitApprovalRequest,
  getUserApprovalRequests,
  updateApprovalStatus,
  getApprovalNotifications,
  markNotificationAsRead,
  getApprovalStatistics,
  processApprovedLoanApplication,
} from '../services/approvalWorkflow';
import { supabase } from '../integrations/supabase/client';

describe('Approval Workflow Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitApprovalRequest', () => {
    it('should submit a loan application approval request', async () => {
      const mockFromChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-request-id' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await submitApprovalRequest({
        user_id: 'test-user-id',
        request_type: 'loan_application',
        request_data: { amount: 10000, term: 12 },
        priority: 'normal',
      });

      expect(supabase.from).toHaveBeenCalledWith('approval_requests');
      expect(result.success).toBe(true);
      expect(result.requestId).toBe('new-request-id');
    });

    it('should handle submission errors', async () => {
      const mockFromChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await submitApprovalRequest({
        user_id: 'test-user-id',
        request_type: 'loan_application',
        request_data: {},
        priority: 'normal',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getUserApprovalRequests', () => {
    it('should fetch approval requests with status filter', async () => {
      const mockRequests = [
        { id: 'req-1', status: 'pending', request_type: 'loan_application' },
      ];

      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockRequests,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getUserApprovalRequests('pending');

      expect(supabase.from).toHaveBeenCalledWith('approval_requests');
      expect(result.success).toBe(true);
      expect(result.requests).toEqual(mockRequests);
    });

    it('should handle fetch errors', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Fetch error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getUserApprovalRequests();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch error');
    });
  });

  describe('updateApprovalStatus', () => {
    it('should update approval status successfully', async () => {
      (supabase.auth as any).getUser.mockResolvedValue({
        data: { user: { id: 'reviewer-id' } },
      });

      const mockFromChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'request-123', status: 'approved' }],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await updateApprovalStatus(
        'request-123',
        'approved',
        'Loan meets all criteria'
      );

      expect(supabase.from).toHaveBeenCalledWith('approval_requests');
      expect(result.success).toBe(true);
    });

    it('should handle update errors', async () => {
      const mockFromChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await updateApprovalStatus('request-123', 'under_review');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update error');
    });
  });

  describe('getApprovalNotifications', () => {
    it('should fetch notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          approval_request_id: 'request-1',
          notification_type: 'new_request',
          message: 'New loan application submitted',
          is_read: false,
          sent_at: new Date().toISOString(),
        },
      ];

      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockNotifications,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getApprovalNotifications();

      expect(supabase.from).toHaveBeenCalledWith('approval_notifications');
      expect(result.success).toBe(true);
      expect(result.notifications).toEqual(mockNotifications);
    });

    it('should filter unread notifications', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getApprovalNotifications(true);

      expect(result.success).toBe(true);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const mockFromChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'notif-1', is_read: true }],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await markNotificationAsRead('notif-1');

      expect(supabase.from).toHaveBeenCalledWith('approval_notifications');
      expect(result.success).toBe(true);
    });
  });

  describe('getApprovalStatistics', () => {
    it('should fetch approval statistics', async () => {
      const mockData = [
        { status: 'pending', request_type: 'loan_application', priority: 'normal', created_at: '2025-01-01', reviewed_at: null },
        { status: 'approved', request_type: 'loan_application', priority: 'high', created_at: '2025-01-01', reviewed_at: '2025-01-02' },
        { status: 'rejected', request_type: 'kyc_document', priority: 'normal', created_at: '2025-01-01', reviewed_at: '2025-01-03' },
      ];

      const mockFromChain = {
        select: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getApprovalStatistics();

      expect(supabase.from).toHaveBeenCalledWith('approval_requests');
      expect(result.success).toBe(true);
      expect(result.stats?.total).toBe(3);
      expect(result.stats?.pending).toBe(1);
      expect(result.stats?.approved).toBe(1);
      expect(result.stats?.rejected).toBe(1);
    });

    it('should handle statistics fetch errors', async () => {
      const mockFromChain = {
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Statistics error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getApprovalStatistics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Statistics error');
    });
  });

  describe('processApprovedLoanApplication', () => {
    it('should process approved loan application', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { success: true, loan_id: 'loan-456' },
        error: null,
      });

      const result = await processApprovedLoanApplication('request-123');

      expect(supabase.rpc).toHaveBeenCalledWith('process_approval_transaction', {
        request_id: 'request-123',
      });
      expect(result.success).toBe(true);
      expect(result.loanId).toBe('loan-456');
    });

    it('should handle processing errors', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Processing error' },
      });

      const result = await processApprovedLoanApplication('request-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing error');
    });
  });
});

describe('Approval Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete loan approval workflow', async () => {
    // Step 1: Submit request
    const mockInsertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'request-123' },
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockInsertChain);

    const submitResult = await submitApprovalRequest({
      user_id: 'test-user-id',
      request_type: 'loan_application',
      request_data: { amount: 15000, term: 24 },
      priority: 'high',
    });

    expect(submitResult.success).toBe(true);
    expect(submitResult.requestId).toBe('request-123');

    // Step 2: Update status
    (supabase.auth as any).getUser.mockResolvedValue({
      data: { user: { id: 'reviewer-id' } },
    });

    const mockUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'request-123', status: 'approved' }],
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockUpdateChain);

    const updateResult = await updateApprovalStatus(
      'request-123',
      'approved',
      'Approved after review'
    );

    expect(updateResult.success).toBe(true);
  });

  it('should handle rejection workflow', async () => {
    (supabase.auth as any).getUser.mockResolvedValue({
      data: { user: { id: 'reviewer-id' } },
    });

    const mockUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'request-123', status: 'rejected' }],
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockUpdateChain);

    const result = await updateApprovalStatus(
      'request-123',
      'rejected',
      'Insufficient income verification'
    );

    expect(result.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('approval_requests');
  });
});
