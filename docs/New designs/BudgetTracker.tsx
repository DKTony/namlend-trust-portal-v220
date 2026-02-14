import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { financeService } from '../services/financeService';
import { UnifiedTransaction, BudgetLimit, SavingsGoal } from '../types';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  PieChart as PieIcon, 
  TrendingUp, 
  Target, 
  Plus, 
  Plane, 
  Laptop, 
  Home,
  AlertCircle
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

export const BudgetTracker: React.FC = () => {
  const { styles, theme } = useTheme();
  
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // --- CSV Upload Handlers ---
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
      // Simulate delay for effect
      await new Promise(r => setTimeout(r, 1000)); 
      await financeService.processCSVUpload(file);
      await loadData(); // Reload data to show new transactions/budgets
    } catch (err) {
      alert("Error parsing CSV");
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
    <div className="p-6 lg:p-10 flex flex-col gap-8 pb-24 pt-16 lg:pt-10 animate-fade-in-up">
      <div className="pl-12 lg:pl-0">
         <h2 className={`text-3xl font-bold mb-2 ${styles.textClass}`}>Budget & Finance</h2>
         <p className={`${styles.textClass} opacity-70`}>Upload statements, track spending, and manage savings goals.</p>
      </div>

      {/* Top Grid: Upload & Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CSV Upload Area */}
        <div 
          className={`
            relative rounded-3xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all
            ${dragActive ? 'border-blue-500 bg-blue-500/10' : `${styles.borderClass} ${styles.variant === 'glass' ? 'bg-white/5' : ''}`}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            accept=".csv"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          <div className={`p-4 rounded-full mb-4 ${styles.variant === 'glass' ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {loading ? <div className="animate-spin w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent"/> : <UploadCloud size={32} className={styles.textClass} />}
          </div>
          <h3 className={`font-semibold text-lg ${styles.textClass}`}>
             {loading ? 'Processing Statement...' : 'Upload Bank Statement'}
          </h3>
          <p className={`text-sm opacity-60 mt-2 max-w-xs ${styles.textClass}`}>
            Drag & drop your CSV file here, or click to browse. We support Standard Bank, FNB, and Nedbank formats.
          </p>
        </div>

        {/* Savings Goals */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {savings.map((goal, idx) => {
             const progress = (goal.currentAmount / goal.targetAmount) * 100;
             return (
               <Card key={idx} className="flex flex-col justify-between">
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-xl ${styles.accentClass}`}>
                          {getIcon(goal.icon)}
                       </div>
                       <div>
                          <h4 className={`font-semibold ${styles.textClass}`}>{goal.name}</h4>
                          <p className={`text-xs opacity-60 ${styles.textClass}`}>Target: {goal.deadline}</p>
                       </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500`}>
                       {Math.round(progress)}%
                    </span>
                 </div>
                 
                 <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2 font-medium">
                       <span className={styles.textClass}>N$ {goal.currentAmount.toLocaleString()}</span>
                       <span className={`opacity-60 ${styles.textClass}`}>of N$ {goal.targetAmount.toLocaleString()}</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${styles.variant === 'glass' ? 'bg-white/10' : 'bg-gray-200 dark:bg-gray-700'}`}>
                       <div className={`h-full rounded-full transition-all duration-1000 ${styles.accentClass}`} style={{ width: `${progress}%` }} />
                    </div>
                    <Button variant="ghost" className="w-full mt-2 text-xs h-8">
                       + Add Funds
                    </Button>
                 </div>
               </Card>
             );
          })}
          
          {/* Add Goal Button */}
          <button className={`
             border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:opacity-80
             ${styles.borderClass} ${styles.textClass} opacity-50
          `}>
             <Plus size={32} />
             <span className="font-medium">New Goal</span>
          </button>
        </div>
      </div>

      {/* Middle Grid: Budget Chart & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Spending Distribution */}
         <Card className="min-h-[350px]">
            <h3 className={`font-semibold mb-6 ${styles.textClass}`}>Monthly Spending Breakdown</h3>
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
                           backgroundColor: 'rgba(0,0,0,0.8)', 
                           borderRadius: '12px', 
                           border: 'none', 
                           color: '#fff' 
                        }} 
                     />
                     <Legend />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </Card>

         {/* Budget Categories */}
         <Card className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
               <h3 className={`font-semibold ${styles.textClass}`}>Category Budgets</h3>
               <Button variant="ghost" className="text-xs">Edit Budgets</Button>
            </div>
            
            <div className="space-y-6">
               {budgets.map((budget, i) => {
                  const percent = Math.min((budget.spent / budget.limit) * 100, 100);
                  const isOver = budget.spent > budget.limit;
                  return (
                     <div key={i}>
                        <div className="flex justify-between items-end mb-2">
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.color }} />
                              <span className={`font-medium ${styles.textClass}`}>{budget.category}</span>
                              {isOver && <AlertCircle size={14} className="text-rose-500" />}
                           </div>
                           <div className={`text-sm ${styles.textClass}`}>
                              <span className={isOver ? 'text-rose-500 font-bold' : ''}>N$ {budget.spent.toLocaleString()}</span>
                              <span className="opacity-50"> / N$ {budget.limit.toLocaleString()}</span>
                           </div>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${styles.variant === 'glass' ? 'bg-white/10' : 'bg-gray-200 dark:bg-gray-700'}`}>
                           <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${percent}%`, backgroundColor: isOver ? '#ef4444' : budget.color }} 
                           />
                        </div>
                     </div>
                  )
               })}
            </div>
         </Card>
      </div>

      {/* Unified Transaction List */}
      <Card>
         <div className="flex justify-between items-center mb-6">
            <h3 className={`font-semibold ${styles.textClass}`}>Unified Transactions</h3>
            <div className="flex gap-2">
               <Button variant="ghost" className="text-xs">Filter</Button>
               <Button variant="ghost" className="text-xs">Export</Button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className={`border-b ${styles.borderClass} text-xs opacity-60 uppercase tracking-wider ${styles.textClass}`}>
                     <th className="p-4">Date</th>
                     <th className="p-4">Description</th>
                     <th className="p-4">Category</th>
                     <th className="p-4">Source</th>
                     <th className="p-4 text-right">Amount</th>
                  </tr>
               </thead>
               <tbody className="text-sm">
                  {transactions.map((tx) => (
                     <tr key={tx.id} className={`border-b ${styles.borderClass} hover:bg-white/5 transition-colors`}>
                        <td className={`p-4 opacity-80 ${styles.textClass}`}>{tx.date}</td>
                        <td className={`p-4 font-medium ${styles.textClass}`}>{tx.description}</td>
                        <td className="p-4">
                           <span className={`px-2 py-1 rounded-lg text-xs font-medium ${styles.variant === 'glass' ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-800'} ${styles.textClass}`}>
                              {tx.category}
                           </span>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-1 opacity-60">
                              {tx.source.includes('Upload') ? <FileSpreadsheet size={14} /> : <TrendingUp size={14} />}
                              <span className={`text-xs ${styles.textClass}`}>{tx.source.includes('Upload') ? 'Statement' : 'System'}</span>
                           </div>
                        </td>
                        <td className={`p-4 text-right font-bold ${tx.type === 'in' ? 'text-emerald-500' : styles.textClass}`}>
                           {tx.type === 'out' ? '-' : '+'} N$ {tx.amount.toFixed(2)}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {transactions.length === 0 && (
               <div className="p-8 text-center opacity-50">
                  <p>No transactions found. Upload a statement to get started.</p>
               </div>
            )}
         </div>
      </Card>
    </div>
  );
};
