/**
 * Finance Service
 * 
 * Handles budget tracking, transaction management, and savings goals
 * for the client-side budget tracker feature.
 */

import { supabase } from '@/integrations/supabase/client';
import type { UnifiedTransaction, BudgetLimit, SavingsGoal } from '@/types/theme';

export interface CSVUploadResult {
  success: boolean;
  transactionsImported: number;
  errors?: string[];
}

// Mock data for initial implementation - will be replaced with Supabase queries
const mockTransactions: UnifiedTransaction[] = [
  {
    id: '1',
    date: '2026-01-13',
    description: 'Salary Deposit',
    category: 'Income',
    source: 'System',
    type: 'in',
    amount: 25000.00,
  },
  {
    id: '2',
    date: '2026-01-12',
    description: 'Pick n Pay Groceries',
    category: 'Groceries',
    source: 'Statement Upload',
    type: 'out',
    amount: 1250.50,
  },
  {
    id: '3',
    date: '2026-01-11',
    description: 'Shell Fuel Station',
    category: 'Transport',
    source: 'Statement Upload',
    type: 'out',
    amount: 850.00,
  },
  {
    id: '4',
    date: '2026-01-10',
    description: 'Telecom Namibia',
    category: 'Utilities',
    source: 'System',
    type: 'out',
    amount: 450.00,
  },
  {
    id: '5',
    date: '2026-01-09',
    description: 'NamLend Loan Repayment',
    category: 'Loan',
    source: 'System',
    type: 'out',
    amount: 2500.00,
  },
];

const mockBudgets: BudgetLimit[] = [
  { id: '1', category: 'Groceries', limit: 4000, spent: 2850, color: '#10b981' },
  { id: '2', category: 'Transport', limit: 2000, spent: 1650, color: '#3b82f6' },
  { id: '3', category: 'Utilities', limit: 1500, spent: 980, color: '#8b5cf6' },
  { id: '4', category: 'Entertainment', limit: 1000, spent: 1250, color: '#f59e0b' },
  { id: '5', category: 'Loan', limit: 3000, spent: 2500, color: '#ef4444' },
];

const mockSavings: SavingsGoal[] = [
  {
    id: '1',
    name: 'Holiday Fund',
    targetAmount: 15000,
    currentAmount: 8500,
    deadline: 'Dec 2026',
    icon: 'plane',
  },
  {
    id: '2',
    name: 'New Laptop',
    targetAmount: 12000,
    currentAmount: 4200,
    deadline: 'Jun 2026',
    icon: 'laptop',
  },
  {
    id: '3',
    name: 'Emergency Fund',
    targetAmount: 50000,
    currentAmount: 32000,
    deadline: 'Ongoing',
    icon: 'home',
  },
];

class FinanceService {
  /**
   * Get all transactions for the current user
   */
  async getTransactions(): Promise<UnifiedTransaction[]> {
    try {
      // TODO: Replace with actual Supabase query when table is created
      // const { data, error } = await supabase
      //   .from('user_transactions')
      //   .select('*')
      //   .order('date', { ascending: false });
      
      // For now, return mock data
      return mockTransactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Get budget overview with spending by category
   */
  async getBudgetOverview(): Promise<BudgetLimit[]> {
    try {
      // TODO: Replace with actual Supabase query
      return mockBudgets;
    } catch (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }
  }

  /**
   * Get all savings goals for the current user
   */
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    try {
      // TODO: Replace with actual Supabase query
      return mockSavings;
    } catch (error) {
      console.error('Error fetching savings goals:', error);
      return [];
    }
  }

  /**
   * Process CSV file upload from bank statement
   * Supports Standard Bank, FNB, and Nedbank formats
   */
  async processCSVUpload(file: File): Promise<CSVUploadResult> {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return { success: false, transactionsImported: 0, errors: ['File is empty or has no data rows'] };
      }

      // Parse CSV header to detect bank format
      const header = lines[0].toLowerCase();
      let bankFormat: 'standard' | 'fnb' | 'nedbank' | 'unknown' = 'unknown';
      
      if (header.includes('standard bank')) {
        bankFormat = 'standard';
      } else if (header.includes('fnb') || header.includes('first national')) {
        bankFormat = 'fnb';
      } else if (header.includes('nedbank')) {
        bankFormat = 'nedbank';
      }

      // Parse transactions based on format
      const transactions: UnifiedTransaction[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
          
          if (cols.length < 3) continue;

          // Generic parsing - adjust based on actual CSV format
          const tx: UnifiedTransaction = {
            id: `upload-${Date.now()}-${i}`,
            date: cols[0] || new Date().toISOString().split('T')[0],
            description: cols[1] || 'Unknown',
            category: this.categorizeTransaction(cols[1] || ''),
            source: `Statement Upload (${bankFormat})`,
            type: parseFloat(cols[2]) < 0 ? 'out' : 'in',
            amount: Math.abs(parseFloat(cols[2]) || 0),
          };

          transactions.push(tx);
        } catch (parseError) {
          errors.push(`Row ${i + 1}: Failed to parse`);
        }
      }

      // TODO: Save transactions to Supabase
      // For now, just add to mock data
      mockTransactions.unshift(...transactions);

      return {
        success: true,
        transactionsImported: transactions.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Error processing CSV:', error);
      return {
        success: false,
        transactionsImported: 0,
        errors: ['Failed to process file'],
      };
    }
  }

  /**
   * Categorize a transaction based on description keywords
   */
  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('pick n pay') || desc.includes('checkers') || desc.includes('shoprite') || desc.includes('spar')) {
      return 'Groceries';
    }
    if (desc.includes('shell') || desc.includes('engen') || desc.includes('caltex') || desc.includes('fuel')) {
      return 'Transport';
    }
    if (desc.includes('telecom') || desc.includes('nampower') || desc.includes('water') || desc.includes('electric')) {
      return 'Utilities';
    }
    if (desc.includes('namlend') || desc.includes('loan') || desc.includes('credit')) {
      return 'Loan';
    }
    if (desc.includes('salary') || desc.includes('deposit') || desc.includes('transfer in')) {
      return 'Income';
    }
    if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('movie') || desc.includes('entertainment')) {
      return 'Entertainment';
    }
    
    return 'Other';
  }

  /**
   * Create a new savings goal
   */
  async createSavingsGoal(goal: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal | null> {
    try {
      const newGoal: SavingsGoal = {
        ...goal,
        id: `goal-${Date.now()}`,
      };
      
      // TODO: Save to Supabase
      mockSavings.push(newGoal);
      
      return newGoal;
    } catch (error) {
      console.error('Error creating savings goal:', error);
      return null;
    }
  }

  /**
   * Add funds to a savings goal
   */
  async addToSavingsGoal(goalId: string, amount: number): Promise<boolean> {
    try {
      const goal = mockSavings.find(g => g.id === goalId);
      if (goal) {
        goal.currentAmount += amount;
        // TODO: Update in Supabase
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding to savings goal:', error);
      return false;
    }
  }

  /**
   * Update a budget limit
   */
  async updateBudgetLimit(budgetId: string, newLimit: number): Promise<boolean> {
    try {
      const budget = mockBudgets.find(b => b.id === budgetId);
      if (budget) {
        budget.limit = newLimit;
        // TODO: Update in Supabase
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating budget:', error);
      return false;
    }
  }
}

export const financeService = new FinanceService();
