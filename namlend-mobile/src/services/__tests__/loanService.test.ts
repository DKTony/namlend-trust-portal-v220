/**
 * Loan Service Tests
 * Version: v2.6.0
 */

import { LoanService } from '../loanService';
import { supabase } from '../supabaseClient';

// Mock Supabase client
jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('LoanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitLoanApplication', () => {
    it('should submit loan application successfully', async () => {
      const mockUser = { id: 'user-123' };
      const mockApplicationData = {
        amount: 10000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 1000,
        total_repayment: 12000,
        purpose: 'Home improvement',
        employment_status: 'employed_full_time',
        monthly_income: 5000,
        monthly_expenses: 3000,
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'request-123' },
            error: null,
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await LoanService.submitLoanApplication(
        mockUser.id,
        mockApplicationData
      );

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          request_type: 'loan_application',
          status: 'pending',
        })
      );
    });

    it('should handle submission errors', async () => {
      const mockUser = { id: 'user-123' };
      const mockApplicationData = { amount: 10000 };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await LoanService.submitLoanApplication(
        mockUser.id,
        mockApplicationData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
