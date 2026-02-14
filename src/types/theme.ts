/**
 * Theme System Types
 * NamLend Premium Design System (NPDS) - NextGen
 * Defines the glass/lux/neo theme variants with dark/light mode support
 */

import React from 'react';

export type ThemeVariant = 'glass' | 'lux' | 'neo';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeConfig {
  name: string;
  variant: ThemeVariant;
  background: string;
  cardClass: string;
  textClass: string;
  accentClass: string;
  borderClass: string;
  buttonClass: string;
  inputClass: string;
  badgeClass: string;
  radius: string;
}

export interface ThemeContextType {
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  styles: ThemeConfig;
}

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
