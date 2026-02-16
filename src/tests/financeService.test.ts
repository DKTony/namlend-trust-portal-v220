import { describe, it, expect, vi } from 'vitest';

// Mock Supabase to prevent localStorage access errors in jsdom
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { financeService } from '@/services/financeService';

describe('financeService', () => {
  describe('getTransactions', () => {
    it('returns an array of transactions', async () => {
      const transactions = await financeService.getTransactions();
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThanOrEqual(5);
    });

    it('each transaction has required fields', async () => {
      const transactions = await financeService.getTransactions();
      for (const tx of transactions) {
        expect(tx).toHaveProperty('id');
        expect(tx).toHaveProperty('date');
        expect(tx).toHaveProperty('description');
        expect(tx).toHaveProperty('category');
        expect(tx).toHaveProperty('source');
        expect(tx).toHaveProperty('type');
        expect(tx).toHaveProperty('amount');
      }
    });

    it('transaction types are "in" or "out"', async () => {
      const transactions = await financeService.getTransactions();
      for (const tx of transactions) {
        expect(['in', 'out']).toContain(tx.type);
      }
    });

    it('amounts are non-negative numbers', async () => {
      const transactions = await financeService.getTransactions();
      for (const tx of transactions) {
        expect(typeof tx.amount).toBe('number');
        expect(tx.amount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getBudgetOverview', () => {
    it('returns an array of budget limits', async () => {
      const budgets = await financeService.getBudgetOverview();
      expect(Array.isArray(budgets)).toBe(true);
      expect(budgets.length).toBeGreaterThanOrEqual(5);
    });

    it('each budget has category, limit, spent, and color', async () => {
      const budgets = await financeService.getBudgetOverview();
      for (const budget of budgets) {
        expect(typeof budget.category).toBe('string');
        expect(typeof budget.limit).toBe('number');
        expect(budget.limit).toBeGreaterThan(0);
        expect(typeof budget.spent).toBe('number');
        expect(budget.spent).toBeGreaterThanOrEqual(0);
        expect(typeof budget.color).toBe('string');
        expect(budget.color).toMatch(/^#/);
      }
    });
  });

  describe('getSavingsGoals', () => {
    it('returns an array of savings goals', async () => {
      const goals = await financeService.getSavingsGoals();
      expect(Array.isArray(goals)).toBe(true);
      expect(goals.length).toBeGreaterThanOrEqual(3);
    });

    it('each goal has all required fields', async () => {
      const goals = await financeService.getSavingsGoals();
      for (const goal of goals) {
        expect(typeof goal.id).toBe('string');
        expect(typeof goal.name).toBe('string');
        expect(typeof goal.targetAmount).toBe('number');
        expect(typeof goal.currentAmount).toBe('number');
        expect(typeof goal.deadline).toBe('string');
        expect(typeof goal.icon).toBe('string');
      }
    });
  });

  describe('addToSavingsGoal', () => {
    it('adds funds to an existing goal and returns true', async () => {
      const goalsBefore = await financeService.getSavingsGoals();
      const goal = goalsBefore.find((g) => g.id === '1');
      const initialAmount = goal!.currentAmount;

      const result = await financeService.addToSavingsGoal('1', 500);
      expect(result).toBe(true);

      const goalsAfter = await financeService.getSavingsGoals();
      const updatedGoal = goalsAfter.find((g) => g.id === '1');
      expect(updatedGoal!.currentAmount).toBe(initialAmount + 500);
    });

    it('returns false for non-existent goal ID', async () => {
      const result = await financeService.addToSavingsGoal('non-existent-id', 100);
      expect(result).toBe(false);
    });
  });

  describe('createSavingsGoal', () => {
    it('creates a new goal and returns it with a generated ID', async () => {
      const result = await financeService.createSavingsGoal({
        name: 'Test Goal',
        targetAmount: 5000,
        currentAmount: 0,
        deadline: 'Dec 2026',
        icon: 'target',
      });

      expect(result).not.toBeNull();
      expect(result!.id).toMatch(/^goal-/);
      expect(result!.name).toBe('Test Goal');
      expect(result!.targetAmount).toBe(5000);
      expect(result!.currentAmount).toBe(0);
      expect(result!.deadline).toBe('Dec 2026');
      expect(result!.icon).toBe('target');
    });

    it('newly created goal appears in getSavingsGoals', async () => {
      await financeService.createSavingsGoal({
        name: 'Unique Vitest Goal',
        targetAmount: 7777,
        currentAmount: 0,
        deadline: 'Ongoing',
        icon: 'plane',
      });

      const goals = await financeService.getSavingsGoals();
      const found = goals.find((g) => g.name === 'Unique Vitest Goal');
      expect(found).toBeDefined();
      expect(found!.targetAmount).toBe(7777);
    });
  });

  describe('processCSVUpload', () => {
    // jsdom's File doesn't implement .text(), so we create a file-like object
    function mockFile(content: string): File {
      return { text: async () => content } as unknown as File;
    }

    it('returns error for empty file', async () => {
      const result = await financeService.processCSVUpload(mockFile(''));
      expect(result.success).toBe(false);
      expect(result.transactionsImported).toBe(0);
      expect(result.errors).toBeDefined();
    });

    it('parses valid CSV and imports transactions', async () => {
      const csv = [
        'Date,Description,Amount',
        '2026-01-15,Pick n Pay Shopping,-350.00',
        '2026-01-16,Salary Deposit,15000.00',
      ].join('\n');
      const result = await financeService.processCSVUpload(mockFile(csv));
      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(2);
    });
  });

  describe('updateBudgetLimit', () => {
    it('updates an existing budget limit and returns true', async () => {
      const result = await financeService.updateBudgetLimit('1', 5000);
      expect(result).toBe(true);

      const budgets = await financeService.getBudgetOverview();
      const updated = budgets.find((b) => b.id === '1');
      expect(updated!.limit).toBe(5000);
    });

    it('returns false for non-existent budget ID', async () => {
      const result = await financeService.updateBudgetLimit('non-existent', 1000);
      expect(result).toBe(false);
    });
  });
});
