/**
 * Budget Tracker Page
 *
 * Client-side budget management with CSV upload, spending tracking, and savings goals
 */

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/context/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import type {
  BudgetLimit,
  SavingsGoal,
  TransactionCategory,
  UnifiedTransaction,
} from '@/types/theme';
import { formatNAD } from '@/utils/currency';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Filter,
  Home,
  Laptop,
  Loader2,
  Plane,
  Plus,
  Target,
  TrendingUp,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

const INITIAL_TRANSACTIONS: UnifiedTransaction[] = [
  {
    id: '1',
    date: '2026-01-13',
    description: 'Salary Deposit',
    category: 'Income',
    source: 'System',
    type: 'in',
    amount: 25000.0,
  },
  {
    id: '2',
    date: '2026-01-12',
    description: 'Pick n Pay Groceries',
    category: 'Groceries',
    source: 'Statement Upload',
    type: 'out',
    amount: 1250.5,
  },
  {
    id: '3',
    date: '2026-01-11',
    description: 'Shell Fuel Station',
    category: 'Transport',
    source: 'Statement Upload',
    type: 'out',
    amount: 850.0,
  },
  {
    id: '4',
    date: '2026-01-10',
    description: 'Telecom Namibia',
    category: 'Utilities',
    source: 'System',
    type: 'out',
    amount: 450.0,
  },
  {
    id: '5',
    date: '2026-01-09',
    description: 'NamLend Loan Repayment',
    category: 'Loan',
    source: 'System',
    type: 'out',
    amount: 2500.0,
  },
];

const INITIAL_BUDGETS: BudgetLimit[] = [
  { id: '1', category: 'Groceries', limit: 4000, spent: 2850, color: '#10b981' },
  { id: '2', category: 'Transport', limit: 2000, spent: 1650, color: '#3b82f6' },
  { id: '3', category: 'Utilities', limit: 1500, spent: 980, color: '#8b5cf6' },
  { id: '4', category: 'Entertainment', limit: 1000, spent: 1250, color: '#f59e0b' },
  { id: '5', category: 'Loan', limit: 3000, spent: 2500, color: '#ef4444' },
];

const INITIAL_SAVINGS: SavingsGoal[] = [
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

function categorizeTransaction(description: string): TransactionCategory {
  const desc = description.toLowerCase();
  if (
    desc.includes('pick n pay') ||
    desc.includes('checkers') ||
    desc.includes('shoprite') ||
    desc.includes('spar')
  )
    return 'Groceries';
  if (
    desc.includes('shell') ||
    desc.includes('engen') ||
    desc.includes('caltex') ||
    desc.includes('fuel')
  )
    return 'Transport';
  if (
    desc.includes('telecom') ||
    desc.includes('nampower') ||
    desc.includes('water') ||
    desc.includes('electric')
  )
    return 'Utilities';
  if (desc.includes('namlend') || desc.includes('loan') || desc.includes('credit')) return 'Loan';
  if (desc.includes('salary') || desc.includes('deposit') || desc.includes('transfer in'))
    return 'Income';
  if (
    desc.includes('restaurant') ||
    desc.includes('cafe') ||
    desc.includes('movie') ||
    desc.includes('entertainment')
  )
    return 'Entertainment';
  return 'Other';
}

export const BudgetTracker: React.FC = () => {
  const { styles } = useTheme();
  const isMobile = useIsMobile();
  const { t } = useTranslation('budget');
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<UnifiedTransaction[]>(INITIAL_TRANSACTIONS);
  const [budgets] = useState<BudgetLimit[]>(INITIAL_BUDGETS);
  const [savings, setSavings] = useState<SavingsGoal[]>(INITIAL_SAVINGS);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('budget');

  const handleTabChange = (tab: string) => {
    // Internal BudgetTracker tabs — stay on this page
    if (['budget', 'transactions', 'savings'].includes(tab)) {
      setActiveTab(tab);
      return;
    }
    // Documents tab routes to KYC page
    if (tab === 'documents') {
      navigate('/kyc');
      return;
    }
    // All other sidebar tabs live on /dashboard
    navigate('/dashboard', { state: { tab } });
  };

  // Add Funds dialog state
  const [addFundsGoalId, setAddFundsGoalId] = useState<string | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [addFundsLoading, setAddFundsLoading] = useState(false);

  // Create Goal dialog state
  const [showCreateGoalDialog, setShowCreateGoalDialog] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('target');
  const [createGoalLoading, setCreateGoalLoading] = useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length >= 2) {
        const parsed: UnifiedTransaction[] = [];
        let skipped = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
          const amount = parseFloat(cols[2]);
          if (cols.length < 3 || !Number.isFinite(amount)) {
            skipped++;
            continue;
          }
          parsed.push({
            id: `upload-${Date.now()}-${i}`,
            date: cols[0] || new Date().toISOString().split('T')[0],
            description: cols[1] || 'Unknown',
            category: categorizeTransaction(cols[1] || ''),
            source: 'Statement Upload',
            type: amount < 0 ? 'out' : 'in',
            amount: Math.abs(amount),
          });
        }
        setTransactions((prev) => [...parsed, ...prev]);
        toast({
          title: `Imported ${parsed.length} transaction${parsed.length === 1 ? '' : 's'}`,
          description:
            skipped > 0
              ? `${skipped} row${skipped === 1 ? '' : 's'} skipped (invalid format).`
              : undefined,
          variant: parsed.length === 0 ? 'destructive' : undefined,
        });
      } else {
        toast({
          title: 'Nothing to import',
          description: 'The file appears to be empty or missing a data row.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error parsing CSV:', err);
      toast({
        title: 'Import failed',
        description: 'The file could not be read. Please check the format and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'plane':
        return <Plane size={18} />;
      case 'laptop':
        return <Laptop size={18} />;
      case 'home':
        return <Home size={18} />;
      default:
        return <Target size={18} />;
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    return true;
  });
  const uniqueCategories = Array.from(new Set(transactions.map((tx) => tx.category)));
  const hasActiveFilters = filterCategory !== 'all' || filterType !== 'all';

  const handleAddFunds = async () => {
    if (!addFundsGoalId || !addFundsAmount) return;

    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: t('toast.invalidAmountTitle'),
        description: t('toast.invalidAmountDescription'),
        variant: 'destructive',
      });
      return;
    }

    setAddFundsLoading(true);
    try {
      const goalExists = savings.some((g) => g.id === addFundsGoalId);
      if (goalExists) {
        setSavings((prev) =>
          prev.map((g) =>
            g.id === addFundsGoalId ? { ...g, currentAmount: g.currentAmount + amount } : g
          )
        );
        toast({
          title: t('toast.fundsAddedTitle'),
          description: t('toast.fundsAddedDescription', { amount: formatNAD(amount) }),
        });
        setAddFundsGoalId(null);
        setAddFundsAmount('');
      } else {
        toast({
          title: t('toast.fundsFailedTitle'),
          description: t('toast.fundsFailedDescription'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding funds:', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    } finally {
      setAddFundsLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoalName || !newGoalTarget) {
      toast({
        title: t('toast.missingInfoTitle'),
        description: t('toast.missingInfoDescription'),
        variant: 'destructive',
      });
      return;
    }

    const targetAmount = parseFloat(newGoalTarget);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast({
        title: t('toast.invalidAmountTitle'),
        description: t('toast.invalidAmountDescription'),
        variant: 'destructive',
      });
      return;
    }

    setCreateGoalLoading(true);
    try {
      const newGoal: SavingsGoal = {
        id: `goal-${Date.now()}`,
        name: newGoalName,
        targetAmount,
        currentAmount: 0,
        deadline: newGoalDeadline || 'Ongoing',
        icon: newGoalIcon,
      };
      setSavings((prev) => [...prev, newGoal]);
      toast({
        title: t('toast.goalCreatedTitle'),
        description: t('toast.goalCreatedDescription', { name: newGoal.name }),
      });
      setShowCreateGoalDialog(false);
      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalDeadline('');
      setNewGoalIcon('target');
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    } finally {
      setCreateGoalLoading(false);
    }
  };

  const handleExportTransactions = () => {
    if (transactions.length === 0) {
      toast({
        title: t('toast.noDataTitle'),
        description: t('toast.noDataDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const headers = ['Date', 'Description', 'Category', 'Source', 'Amount'];
      const csvContent = [
        headers.join(','),
        ...transactions.map((tx) =>
          [
            tx.date,
            `"${tx.description.replace(/"/g, '""')}"`,
            tx.category,
            tx.source.includes('Upload') ? 'Statement' : 'System',
            tx.type === 'out' ? `-${tx.amount.toFixed(2)}` : tx.amount.toFixed(2),
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `namlend-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: t('toast.exportCompleteTitle'),
        description: t('toast.exportCompleteDescription', { count: transactions.length }),
      });
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: t('toast.exportFailedTitle'),
        description: t('toast.exportFailedDescription'),
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title={t('title')}>
      <div
        className="p-6 lg:p-10 flex flex-col gap-8 animate-fade-in-up"
        data-testid="budget-tracker-page"
      >
        <div>
          <h2 className="text-3xl font-bold mb-2 text-foreground">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Top Grid: Upload & Savings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CSV Upload Area */}
          <div
            className={`
              relative rounded-3xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all
              ${dragActive ? 'border-primary bg-primary/10' : 'border-border bg-card/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="csv-upload-zone"
          >
            <input
              type="file"
              accept=".csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              aria-label={t('upload.ariaLabel')}
            />
            <div className="p-4 rounded-full mb-4 bg-muted">
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <UploadCloud size={32} className="text-foreground" />
              )}
            </div>
            <h3 className="font-semibold text-lg text-foreground">
              {loading ? t('upload.processing') : t('upload.title')}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">{t('upload.description')}</p>
          </div>

          {/* Savings Goals */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {savings.map((goal, idx) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <ThemedCard key={idx} data-testid={`savings-goal-${idx}`}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${styles.accentClass}`}>
                          {getIcon(goal.icon)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{goal.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t('savings.target', { deadline: goal.deadline })}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                        {Math.round(progress)}%
                      </span>
                    </div>

                    <div className="mt-6">
                      <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className="text-foreground">
                          N$ {goal.currentAmount.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {t('savings.of', { amount: goal.targetAmount.toLocaleString() })}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${styles.accentClass}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <ThemedButton
                        variant="ghost"
                        className="w-full mt-2 text-xs h-8"
                        onClick={() => {
                          setAddFundsGoalId(goal.id);
                          setAddFundsAmount('');
                        }}
                        data-testid={`add-funds-btn-${idx}`}
                      >
                        {t('savings.addFunds')}
                      </ThemedButton>
                    </div>
                  </CardContent>
                </ThemedCard>
              );
            })}

            {/* Add Goal Button */}
            <button
              className="border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:opacity-80 border-border text-muted-foreground min-h-[200px]"
              data-testid="add-savings-goal"
              onClick={() => setShowCreateGoalDialog(true)}
            >
              <Plus size={32} />
              <span className="font-medium">{t('savings.newGoal')}</span>
            </button>
          </div>
        </div>

        {/* Middle Grid: Budget Chart & Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Spending Distribution */}
          <ThemedCard className="min-h-[350px]">
            <CardHeader>
              <CardTitle>{t('spending.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={budgets}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="spent"
                    >
                      {budgets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderRadius: '12px',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </ThemedCard>

          {/* Budget Categories */}
          <ThemedCard className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('categories.title')}</CardTitle>
              <ThemedButton variant="ghost" className="text-xs">
                {t('categories.editBudgets')}
              </ThemedButton>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {budgets.map((budget, i) => {
                  const percent = Math.min((budget.spent / budget.limit) * 100, 100);
                  const isOver = budget.spent > budget.limit;
                  return (
                    <div key={i} data-testid={`budget-category-${i}`}>
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: budget.color }}
                          />
                          <span className="font-medium text-foreground">{budget.category}</span>
                          {isOver && <AlertCircle size={14} className="text-destructive" />}
                        </div>
                        <div className="text-sm text-foreground">
                          <span className={isOver ? 'text-destructive font-bold' : ''}>
                            {t('categories.spent', { spent: budget.spent.toLocaleString() })}
                          </span>
                          <span className="text-muted-foreground">
                            {t('categories.limit', { limit: budget.limit.toLocaleString() })}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: isOver ? 'hsl(var(--destructive))' : budget.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </ThemedCard>
        </div>

        {/* Unified Transaction List */}
        <ThemedCard>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('transactions.title')}</CardTitle>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <ThemedButton
                    variant="ghost"
                    className={`text-xs ${hasActiveFilters ? 'text-primary' : ''}`}
                    data-testid="filter-transactions-btn"
                  >
                    <Filter size={14} className="mr-1" />
                    {t('transactions.filter')}
                    {hasActiveFilters && (
                      <span className="ml-1 w-2 h-2 rounded-full bg-primary inline-block" />
                    )}
                  </ThemedButton>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-4">
                    <div className="font-medium text-sm">{t('transactions.filterTitle')}</div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('transactions.category')}</Label>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('transactions.allCategories')}</SelectItem>
                          {uniqueCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('transactions.type')}</Label>
                      <Select
                        value={filterType}
                        onValueChange={(v) => setFilterType(v as 'all' | 'in' | 'out')}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('transactions.allTypes')}</SelectItem>
                          <SelectItem value="in">{t('transactions.income')}</SelectItem>
                          <SelectItem value="out">{t('transactions.expense')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {hasActiveFilters && (
                      <ThemedButton
                        variant="ghost"
                        className="w-full text-xs h-8"
                        onClick={() => {
                          setFilterCategory('all');
                          setFilterType('all');
                        }}
                      >
                        <X size={14} className="mr-1" />
                        {t('transactions.clearFilters')}
                      </ThemedButton>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <ThemedButton
                variant="ghost"
                className="text-xs"
                onClick={handleExportTransactions}
                data-testid="export-transactions-btn"
              >
                <Download size={14} className="mr-1" />
                {t('transactions.export')}
              </ThemedButton>
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              /* Mobile: Card-based transaction list */
              <div className="space-y-3" data-testid="transactions-table">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 border border-border rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{tx.date}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground">
                          {tx.category}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-sm ml-3 tabular-nums ${tx.type === 'in' ? 'text-emerald-500' : 'text-foreground'}`}
                    >
                      {tx.type === 'out' ? '-' : '+'}N${tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>
                      {hasActiveFilters
                        ? t('transactions.noMatchFilters')
                        : t('transactions.noTransactions')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: Full table view */
              <div className="overflow-x-auto">
                <table
                  className="w-full text-left border-collapse"
                  data-testid="transactions-table"
                >
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="p-4">{t('transactions.columns.date')}</th>
                      <th className="p-4">{t('transactions.columns.description')}</th>
                      <th className="p-4">{t('transactions.columns.category')}</th>
                      <th className="p-4">{t('transactions.columns.source')}</th>
                      <th className="p-4 text-right">{t('transactions.columns.amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-4 text-muted-foreground">{tx.date}</td>
                        <td className="p-4 font-medium text-foreground">{tx.description}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-muted text-foreground">
                            {tx.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            {tx.source.includes('Upload') ? (
                              <FileSpreadsheet size={14} />
                            ) : (
                              <TrendingUp size={14} />
                            )}
                            <span className="text-xs">
                              {tx.source.includes('Upload')
                                ? t('transactions.sourceStatement')
                                : t('transactions.sourceSystem')}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`p-4 text-right font-bold ${tx.type === 'in' ? 'text-emerald-500' : 'text-foreground'}`}
                        >
                          {tx.type === 'out' ? '-' : '+'} N$ {tx.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>
                      {hasActiveFilters
                        ? t('transactions.noMatchFilters')
                        : t('transactions.noTransactions')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </ThemedCard>
      </div>

      {/* Add Funds Dialog */}
      <Dialog
        open={addFundsGoalId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddFundsGoalId(null);
            setAddFundsAmount('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('addFundsDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('addFundsDialog.description', {
                name: savings.find((s) => s.id === addFundsGoalId)?.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-funds-amount">{t('addFundsDialog.amountLabel')}</Label>
              <Input
                id="add-funds-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder={t('addFundsDialog.amountPlaceholder')}
                value={addFundsAmount}
                onChange={(e) => setAddFundsAmount(e.target.value)}
                data-testid="add-funds-amount-input"
              />
            </div>
          </div>
          <DialogFooter>
            <ThemedButton
              variant="outline"
              onClick={() => {
                setAddFundsGoalId(null);
                setAddFundsAmount('');
              }}
            >
              {t('addFundsDialog.cancel')}
            </ThemedButton>
            <ThemedButton
              onClick={handleAddFunds}
              disabled={addFundsLoading || !addFundsAmount || parseFloat(addFundsAmount) <= 0}
              data-testid="add-funds-confirm-btn"
            >
              {addFundsLoading ? t('addFundsDialog.adding') : t('addFundsDialog.confirm')}
            </ThemedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Savings Goal Dialog */}
      <Dialog open={showCreateGoalDialog} onOpenChange={setShowCreateGoalDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('createGoalDialog.title')}</DialogTitle>
            <DialogDescription>{t('createGoalDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">{t('createGoalDialog.nameLabel')}</Label>
              <Input
                id="goal-name"
                placeholder={t('createGoalDialog.namePlaceholder')}
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                data-testid="new-goal-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-target">{t('createGoalDialog.targetLabel')}</Label>
              <Input
                id="goal-target"
                type="number"
                min="0"
                step="0.01"
                placeholder={t('createGoalDialog.targetPlaceholder')}
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                data-testid="new-goal-target-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">{t('createGoalDialog.deadlineLabel')}</Label>
              <Input
                id="goal-deadline"
                placeholder={t('createGoalDialog.deadlinePlaceholder')}
                value={newGoalDeadline}
                onChange={(e) => setNewGoalDeadline(e.target.value)}
                data-testid="new-goal-deadline-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('createGoalDialog.iconLabel')}</Label>
              <div className="flex gap-2">
                {[
                  {
                    value: 'plane',
                    icon: <Plane size={18} />,
                    label: t('createGoalDialog.icons.travel'),
                  },
                  {
                    value: 'laptop',
                    icon: <Laptop size={18} />,
                    label: t('createGoalDialog.icons.tech'),
                  },
                  {
                    value: 'home',
                    icon: <Home size={18} />,
                    label: t('createGoalDialog.icons.home'),
                  },
                  {
                    value: 'target',
                    icon: <Target size={18} />,
                    label: t('createGoalDialog.icons.general'),
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      newGoalIcon === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                    onClick={() => setNewGoalIcon(opt.value)}
                    data-testid={`goal-icon-${opt.value}`}
                  >
                    {opt.icon}
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <ThemedButton variant="outline" onClick={() => setShowCreateGoalDialog(false)}>
              {t('createGoalDialog.cancel')}
            </ThemedButton>
            <ThemedButton
              onClick={handleCreateGoal}
              disabled={createGoalLoading || !newGoalName || !newGoalTarget}
              data-testid="create-goal-confirm-btn"
            >
              {createGoalLoading ? t('createGoalDialog.creating') : t('createGoalDialog.confirm')}
            </ThemedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default BudgetTracker;
