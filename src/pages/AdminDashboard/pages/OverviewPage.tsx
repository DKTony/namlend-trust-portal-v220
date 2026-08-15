/**
 * Admin Overview Page
 * Financial summary cards and metrics — the default admin landing page.
 */

import React from 'react';
import FinancialSummaryCards from '../components/Overview/FinancialSummaryCards';
import RevenueChart from '../components/Overview/RevenueChart';
import { useFinancialMetrics } from '../hooks/useFinancialMetrics';

const OverviewPage: React.FC = () => {
  const { metrics, revenueData, loading } = useFinancialMetrics();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <FinancialSummaryCards metrics={metrics} loading={loading} />
      <RevenueChart data={revenueData} loading={loading} />
    </div>
  );
};

export default OverviewPage;
