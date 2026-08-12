import type React from 'react';

export type Page =
  | 'dashboard'
  | 'loans'
  | 'payments'
  | 'documents'
  | 'settings'
  | 'security'
  | 'admin'
  | 'kyc'
  | 'budget'
  | 'clients'
  | 'reports';

export interface StatMetric {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

export type TransactionCategory =
  | 'Food'
  | 'Transport'
  | 'Utilities'
  | 'Entertainment'
  | 'Shopping'
  | 'Income'
  | 'Transfer'
  | 'Groceries'
  | 'Loan'
  | 'Other';

export interface UnifiedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'in' | 'out';
  category: TransactionCategory;
  source: string;
}

export interface BudgetLimit {
  id?: string;
  category: TransactionCategory | string;
  limit: number;
  spent: number;
  color: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
}
