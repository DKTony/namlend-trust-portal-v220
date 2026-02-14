import React from 'react';

export type ThemeVariant = 'glass' | 'lux' | 'neo';

export interface ThemeConfig {
  name: string;
  variant: ThemeVariant;
  background: string;
  cardClass: string;
  textClass: string;
  accentClass: string;
  borderClass: string;
  buttonClass: string;
}

export interface StatMetric {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

export type Page = 'dashboard' | 'loans' | 'payments' | 'documents' | 'security' | 'settings' | 'budget';

// --- Budget & Finance Types ---

export type TransactionCategory = 'Food' | 'Transport' | 'Utilities' | 'Entertainment' | 'Shopping' | 'Income' | 'Transfer' | 'Other';

export interface UnifiedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'in' | 'out';
  category: TransactionCategory;
  source: string; // e.g., "Upload: stmt_jan.csv" or "System"
}

export interface BudgetLimit {
  category: TransactionCategory;
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
  icon: string; // e.g. 'plane', 'car', 'home'
}
