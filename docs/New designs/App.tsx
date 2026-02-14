import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Dashboard } from './pages/Dashboard';
import { LoanApplication } from './pages/LoanApplication';
import { Payments } from './pages/Payments';
import { Documents } from './pages/Documents';
import { Settings } from './pages/Settings';
import { Security } from './pages/Security';
import { BudgetTracker } from './pages/BudgetTracker';
import { Sidebar } from './components/Layout/Sidebar';
import { ThemeSwitcher } from './components/Layout/ThemeSwitcher';
import { HeroCard } from './components/ui/HeroCard';
import { Page } from './types';

const AppContent: React.FC = () => {
  const { styles } = useTheme();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'loans': return <LoanApplication />;
      case 'payments': return <Payments />;
      case 'documents': return <Documents />;
      case 'settings': return <Settings />;
      case 'security': return <Security />;
      case 'budget': return <BudgetTracker />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className={`min-h-screen w-full transition-colors duration-500 relative overflow-x-hidden ${styles.background}`}>
      {/* Background Ambience & Hero Card Layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {styles.variant === 'glass' && (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/30 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '10s' }} />
          </>
        )}
        {styles.variant === 'lux' && (
           <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        )}
        
        {/* Hero Card Floating in Background */}
        <div className="absolute top-20 right-[-80px] md:right-20 lg:right-40 opacity-40 md:opacity-100 scale-75 md:scale-100 z-0 animate-float">
            <HeroCard />
        </div>
      </div>

      {/* Navigation Overlay */}
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      
      {/* Main Content */}
      <main className="min-h-screen relative z-10 w-full">
         {renderPage()}
      </main>

      <ThemeSwitcher />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
