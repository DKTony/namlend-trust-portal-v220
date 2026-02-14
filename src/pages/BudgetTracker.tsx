/**
 * Budget Tracker Page
 * 
 * Client-side budget management with CSV upload, spending tracking, and savings goals
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { financeService } from '@/services/financeService';
import type { UnifiedTransaction, BudgetLimit, SavingsGoal } from '@/types/theme';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  TrendingUp, 
  Target, 
  Plus, 
  Plane, 
  Laptop, 
  Home,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export const BudgetTracker: React.FC = () => {
  const { styles } = useTheme();
  
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('budget');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const tx = await financeService.getTransactions();
    setTransactions(tx);
    const bg = await financeService.getBudgetOverview();
    setBudgets(bg);
    const sv = await financeService.getSavingsGoals();
    setSavings(sv);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
      await new Promise(r => setTimeout(r, 1000)); 
      await financeService.processCSVUpload(file);
      await loadData();
    } catch (err) {
      console.error("Error parsing CSV:", err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'plane': return <Plane size={18} />;
      case 'laptop': return <Laptop size={18} />;
      case 'home': return <Home size={18} />;
      default: return <Target size={18} />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} title="Budget & Finance">
      <div className="p-6 lg:p-10 flex flex-col gap-8 animate-fade-in-up" data-testid="budget-tracker-page">
        <div>
          <h2 className="text-3xl font-bold mb-2 text-foreground">Budget & Finance</h2>
          <p className="text-muted-foreground">Upload statements, track spending, and manage savings goals.</p>
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
              aria-label="Upload CSV file"
            />
            <div className="p-4 rounded-full mb-4 bg-muted">
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <UploadCloud size={32} className="text-foreground" />
              )}
            </div>
            <h3 className="font-semibold text-lg text-foreground">
               {loading ? 'Processing Statement...' : 'Upload Bank Statement'}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              Drag & drop your CSV file here, or click to browse. We support Standard Bank, FNB, and Nedbank formats.
            </p>
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
                              <p className="text-xs text-muted-foreground">Target: {goal.deadline}</p>
                           </div>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                           {Math.round(progress)}%
                        </span>
                     </div>
                     
                     <div className="mt-6">
                        <div className="flex justify-between text-sm mb-2 font-medium">
                           <span className="text-foreground">N$ {goal.currentAmount.toLocaleString()}</span>
                           <span className="text-muted-foreground">of N$ {goal.targetAmount.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                           <div 
                             className={`h-full rounded-full transition-all duration-1000 ${styles.accentClass}`} 
                             style={{ width: `${progress}%` }} 
                           />
                        </div>
                        <ThemedButton variant="ghost" className="w-full mt-2 text-xs h-8">
                           + Add Funds
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
            >
               <Plus size={32} />
               <span className="font-medium">New Goal</span>
            </button>
          </div>
        </div>

        {/* Middle Grid: Budget Chart & Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Spending Distribution */}
           <ThemedCard className="min-h-[350px]">
              <CardHeader>
                <CardTitle>Monthly Spending Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
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
                               color: 'hsl(var(--foreground))' 
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
                <CardTitle>Category Budgets</CardTitle>
                <ThemedButton variant="ghost" className="text-xs">Edit Budgets</ThemedButton>
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
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.color }} />
                                  <span className="font-medium text-foreground">{budget.category}</span>
                                  {isOver && <AlertCircle size={14} className="text-destructive" />}
                               </div>
                               <div className="text-sm text-foreground">
                                  <span className={isOver ? 'text-destructive font-bold' : ''}>
                                    N$ {budget.spent.toLocaleString()}
                                  </span>
                                  <span className="text-muted-foreground"> / N$ {budget.limit.toLocaleString()}</span>
                               </div>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                               <div 
                                  className="h-full rounded-full transition-all duration-1000" 
                                  style={{ width: `${percent}%`, backgroundColor: isOver ? 'hsl(var(--destructive))' : budget.color }} 
                               />
                            </div>
                         </div>
                      )
                   })}
                </div>
              </CardContent>
           </ThemedCard>
        </div>

        {/* Unified Transaction List */}
        <ThemedCard>
           <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Unified Transactions</CardTitle>
              <div className="flex gap-2">
                 <ThemedButton variant="ghost" className="text-xs">Filter</ThemedButton>
                 <ThemedButton variant="ghost" className="text-xs">Export</ThemedButton>
              </div>
           </CardHeader>
           <CardContent>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" data-testid="transactions-table">
                   <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                         <th className="p-4">Date</th>
                         <th className="p-4">Description</th>
                         <th className="p-4">Category</th>
                         <th className="p-4">Source</th>
                         <th className="p-4 text-right">Amount</th>
                      </tr>
                   </thead>
                   <tbody className="text-sm">
                      {transactions.map((tx) => (
                         <tr key={tx.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="p-4 text-muted-foreground">{tx.date}</td>
                            <td className="p-4 font-medium text-foreground">{tx.description}</td>
                            <td className="p-4">
                               <span className="px-2 py-1 rounded-lg text-xs font-medium bg-muted text-foreground">
                                  {tx.category}
                               </span>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-1 text-muted-foreground">
                                  {tx.source.includes('Upload') ? <FileSpreadsheet size={14} /> : <TrendingUp size={14} />}
                                  <span className="text-xs">{tx.source.includes('Upload') ? 'Statement' : 'System'}</span>
                               </div>
                            </td>
                            <td className={`p-4 text-right font-bold ${tx.type === 'in' ? 'text-emerald-500' : 'text-foreground'}`}>
                               {tx.type === 'out' ? '-' : '+'} N$ {tx.amount.toFixed(2)}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                {transactions.length === 0 && (
                   <div className="p-8 text-center text-muted-foreground">
                      <p>No transactions found. Upload a statement to get started.</p>
                   </div>
                )}
             </div>
           </CardContent>
        </ThemedCard>
      </div>
    </DashboardLayout>
  );
};

export default BudgetTracker;
