import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CreditScoreGauge } from '../components/ui/CreditScoreGauge';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { authService } from '../services/authService';
import { loanService } from '../services/loanService';
import { paymentService } from '../services/paymentService';
import { ipsService } from '../services/ipsService';
import { 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Calendar, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Bell
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

// Mock chart data for now, could be moved to service
const data = [
  { name: 'Jan', amount: 4000, credit: 640 },
  { name: 'Feb', amount: 3000, credit: 660 },
  { name: 'Mar', amount: 2000, credit: 680 },
  { name: 'Apr', amount: 2780, credit: 690 },
  { name: 'May', amount: 1890, credit: 710 },
  { name: 'Jun', amount: 2390, credit: 725 },
  { name: 'Jul', amount: 3490, credit: 750 },
];

export const Dashboard: React.FC = () => {
  const { styles, theme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // State from services
  const [profile, setProfile] = useState<any>(null);
  const [activeLoan, setActiveLoan] = useState<any>(null);
  const [nextPayment, setNextPayment] = useState<any>(null);
  const [totalRepaid, setTotalRepaid] = useState(0);

  // IPS Quick Transfer State
  const [vpa, setVpa] = useState('');
  const [amount, setAmount] = useState('');
  const [transferStatus, setTransferStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    const fetchData = async () => {
      const user = await authService.getProfile();
      setProfile(user);
      
      const loan = await loanService.getActiveLoan();
      setActiveLoan(loan);
      
      const payment = await paymentService.getUpcomingPayment();
      setNextPayment(payment);

      const repaid = await paymentService.getTotalRepaid();
      setTotalRepaid(repaid);
    };
    fetchData();
  }, []);

  const handleQuickTransfer = async () => {
    if (!vpa || !amount) return;
    setTransferStatus('loading');
    await ipsService.initiatePayment(vpa, Number(amount));
    setTransferStatus('success');
    setVpa('');
    setAmount('');
    setTimeout(() => setTransferStatus('idle'), 3000);
  };

  // Chart styling based on theme
  const gridColor = theme === 'glass' ? 'rgba(255,255,255,0.1)' : theme === 'lux' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(128,128,128,0.1)';
  const chartColor = theme === 'lux' ? '#D4AF37' : '#3b82f6';
  const secondaryChartColor = theme === 'lux' ? '#ffffff' : '#10b981';

  return (
    <div className="p-6 lg:p-10 flex flex-col gap-8 pb-24 pt-16 lg:pt-10">
      
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-fade-in-down pl-12 lg:pl-0 relative z-10">
        <div>
          <h2 className={`text-3xl md:text-4xl font-bold mb-2 ${styles.textClass} tracking-tight drop-shadow-sm`}>
            Welcome back, <span className="opacity-80">{profile?.firstName || 'Client'}</span>
          </h2>
          <p className={`${styles.textClass} opacity-70 max-w-md`}>
            Here is your financial overview for NamLend Trust.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={() => setShowNotifications(true)}
            className={`p-3 rounded-xl transition-all hover:scale-105 active:scale-95 ${styles.cardClass} group`}
          >
            <div className="relative">
               <Bell className={styles.textClass} size={20} />
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border-2 border-transparent" />
            </div>
          </button>
          <Button variant="secondary">Statements</Button>
          <Button>New Application</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Active Loan Balance', 
            value: activeLoan ? `N$ ${activeLoan.amount.toLocaleString()}` : 'N$ 0', 
            change: '+12%', 
            icon: <DollarSign />, 
            positive: false 
          },
          { 
            label: 'Next Payment', 
            value: nextPayment ? `N$ ${nextPayment.amount.toLocaleString()}` : 'N$ 0', 
            change: nextPayment ? `Due in ${nextPayment.daysLeft} days` : 'No due', 
            icon: <Calendar />, 
            positive: true 
          },
          { 
            label: 'Total Repaid', 
            value: `N$ ${totalRepaid.toLocaleString()}`, 
            change: 'Lifetime', 
            icon: <TrendingUp />, 
            positive: true 
          },
        ].map((stat, idx) => (
          <Card key={idx} className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${styles.variant === 'glass' ? 'bg-white/10' : styles.variant === 'lux' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                {stat.icon}
              </div>
              <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-lg ${stat.positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {stat.positive ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                {stat.change}
              </span>
            </div>
            <div>
              <p className={`text-sm opacity-60 font-medium ${styles.textClass}`}>{stat.label}</p>
              <h3 className={`text-2xl font-bold mt-1 ${styles.textClass}`}>{stat.value}</h3>
            </div>
          </Card>
        ))}

        {/* Credit Score Card with Gauge */}
        <Card className="flex flex-col items-center justify-center animate-fade-in-up p-0 overflow-hidden" style={{ animationDelay: '300ms' }}>
           <div className="absolute top-3 left-4 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${styles.variant === 'glass' ? 'bg-white/10' : 'bg-emerald-500/10'}`}>
                 <Activity size={14} className="text-emerald-500" />
              </div>
              <span className={`text-xs font-semibold ${styles.textClass}`}>Credit Score</span>
           </div>
           <CreditScoreGauge score={profile?.creditScore || 750} />
        </Card>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Analytics Section */}
        <div className="lg:col-span-2 flex flex-col gap-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          
          <Card className="h-[400px]">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg font-semibold ${styles.textClass}`}>Loan Amortization & Credit</h3>
                <select className={`bg-transparent border-none text-sm outline-none cursor-pointer opacity-60 ${styles.textClass}`}>
                  <option>This Year</option>
                  <option>Last Year</option>
                </select>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={secondaryChartColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={secondaryChartColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke={styles.variant === 'glass' ? 'rgba(255,255,255,0.5)' : '#888'} 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      stroke={styles.variant === 'glass' ? 'rgba(255,255,255,0.5)' : '#888'} 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'glass' ? 'rgba(0,0,0,0.8)' : theme === 'lux' ? '#1a1a1a' : '#fff',
                        backdropFilter: 'blur(10px)',
                        border: 'none',
                        borderRadius: '12px',
                        color: theme === 'neo' && !styles.background.includes('zinc-950') ? '#000' : '#fff'
                      }}
                      itemStyle={{ color: theme === 'neo' && !styles.background.includes('zinc-950') ? '#000' : '#fff' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke={chartColor} strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                    <Area type="monotone" dataKey="credit" stroke={secondaryChartColor} strokeWidth={3} fillOpacity={1} fill="url(#colorCredit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-full ${styles.variant === 'glass' ? 'bg-white/20' : 'bg-zinc-800'}`}>
                    <Activity size={20} className={styles.textClass} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${styles.textClass}`}>Quick Transfer</h4>
                    <p className={`text-xs opacity-60 ${styles.textClass}`}>IPS Instant Payment</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="VPA Address" 
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value)}
                    className={`w-full p-3 rounded-xl outline-none transition-all ${styles.variant === 'glass' ? 'bg-white/5 border border-white/10 focus:bg-white/10' : 'bg-transparent border border-zinc-700 focus:border-zinc-500'} ${styles.textClass}`}
                  />
                  <input 
                    type="number" 
                    placeholder="Amount (NAD)" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full p-3 rounded-xl outline-none transition-all ${styles.variant === 'glass' ? 'bg-white/5 border border-white/10 focus:bg-white/10' : 'bg-transparent border border-zinc-700 focus:border-zinc-500'} ${styles.textClass}`}
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleQuickTransfer}
                    disabled={transferStatus === 'loading'}
                  >
                    {transferStatus === 'loading' ? 'Processing...' : transferStatus === 'success' ? 'Sent!' : 'Send Money'}
                  </Button>
                </div>
             </Card>

             <Card className="flex flex-col justify-between">
                <div>
                   <h4 className={`font-semibold ${styles.textClass} mb-2`}>Approval Status</h4>
                   <p className={`text-sm opacity-60 ${styles.textClass} mb-4`}>Your recent disbursement request is being processed.</p>
                </div>
                
                <div className="relative pt-4">
                   <div className={`absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 ${styles.variant === 'glass' ? 'bg-white/10' : 'bg-zinc-800'}`}></div>
                   <div className="relative flex justify-between z-10">
                      {[1, 2, 3].map((step, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 ${styles.background} ${i <= 1 ? 'bg-emerald-500 border-emerald-500 text-white' : `bg-gray-700 border-gray-600 ${styles.textClass}`}`}>
                              {i <= 1 ? '✓' : i + 1}
                           </div>
                           <span className={`text-xs ${styles.textClass} opacity-80`}>
                             {['Applied', 'Review', 'Funded'][i]}
                           </span>
                        </div>
                      ))}
                   </div>
                </div>
             </Card>
          </div>
        </div>

        {/* Side Panel (Recent Activity) */}
        <div className="flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <Card className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-lg font-semibold ${styles.textClass}`}>Recent Activity</h3>
              <Button variant="ghost" className="!p-2"><ChevronRight size={16} /></Button>
            </div>
            
            <div className="space-y-6">
              {[
                { title: 'Loan Disbursement', date: 'Today, 10:23 AM', amount: '+ N$ 5,000', type: 'in' },
                { title: 'Monthly Repayment', date: 'Yesterday, 4:00 PM', amount: '- N$ 1,200', type: 'out' },
                { title: 'Processing Fee', date: 'Dec 24, 2025', amount: '- N$ 150', type: 'out' },
                { title: 'Credit Interest', date: 'Dec 20, 2025', amount: '+ N$ 45', type: 'in' },
                { title: 'Mobile Top-up', date: 'Dec 18, 2025', amount: '- N$ 200', type: 'out' },
              ].map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl transition-all group-hover:scale-110 ${tx.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {tx.type === 'in' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className={`font-medium ${styles.textClass} group-hover:text-blue-500 transition-colors`}>{tx.title}</p>
                      <p className={`text-xs opacity-50 ${styles.textClass}`}>{tx.date}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${tx.type === 'in' ? 'text-emerald-500' : styles.textClass}`}>
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
            
            <div className={`mt-8 pt-6 border-t ${styles.borderClass}`}>
              <Button variant="secondary" className="w-full">View Full History</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
