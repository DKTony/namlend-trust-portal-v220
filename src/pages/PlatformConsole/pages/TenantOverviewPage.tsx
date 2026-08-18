/**
 * Tenant overview — platform-owner operational snapshot for one institution.
 *
 * Opened from the Tenant Registry (row click or Overview action). Legal/regulatory
 * documents stay on `/platform/tenants/:institutionId/info`. Backend
 * `assertPlatformOwner` is the real boundary; the route gate is affordance.
 */

import { ThemedCard } from '@/components/ui/ThemedCard';
import { api } from '@/integrations/convex/api';
import { formatNAD } from '@/utils/currency';
import { useQuery } from 'convex/react';
import {
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  FileText,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Id } from '../../../../convex/_generated/dataModel';

function StatCard({
  label,
  value,
  hint,
  icon,
  testId,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  testId: string;
}) {
  return (
    <ThemedCard
      className="flex items-start justify-between gap-3"
      hoverEffect={false}
      data-testid={testId}
    >
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="text-primary">{icon}</div>
    </ThemedCard>
  );
}

const TenantOverviewPage: React.FC = () => {
  const params = useParams<{ institutionId?: string }>();
  const institutionId = params.institutionId as Id<'institutions'> | undefined;
  const overview = useQuery(
    api.platform.tenants.getTenantOverview,
    institutionId ? { institutionId } : 'skip'
  );

  if (overview === undefined) {
    return (
      <div className="p-6 text-sm text-muted-foreground" role="status">
        Loading tenant overview…
      </div>
    );
  }

  if (overview === null) {
    return (
      <div data-testid="platform-tenant-overview-missing" className="space-y-4 p-4 sm:p-6">
        <Link
          to="/platform/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Tenants
        </Link>
        <p className="text-sm text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  return (
    <div data-testid="platform-tenant-overview" className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/platform/tenants"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Tenants
          </Link>
          <h2 className="text-xl font-semibold">{overview.name}</h2>
          <p className="font-mono text-sm text-muted-foreground">
            {overview.shortCode}
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {overview.type}
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            {overview.status}
          </p>
        </div>
        <Link
          to={`/platform/tenants/${overview.institutionId}/info`}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
        >
          <FileText className="h-4 w-4" /> Tenant Info
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          testId="tenant-overview-clients"
          label="Clients"
          value={overview.clientCount.toLocaleString()}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          testId="tenant-overview-staff"
          label="Staff"
          value={overview.staffCount.toLocaleString()}
          hint={`${overview.adminCount} admins · ${overview.loanOfficerCount} loan officers`}
          icon={<Shield className="h-6 w-6" />}
        />
        <StatCard
          testId="tenant-overview-loans-issued"
          label="Loans issued"
          value={overview.loansIssued.toLocaleString()}
          hint="Funded, active, paid off, defaulted, written off"
          icon={<FileText className="h-6 w-6" />}
        />
        <StatCard
          testId="tenant-overview-loaned-out"
          label="Loaned out"
          value={formatNAD(overview.amountLoanedOut)}
          hint="Completed disbursements"
          icon={<Banknote className="h-6 w-6" />}
        />
        <StatCard
          testId="tenant-overview-repaid"
          label="Repaid"
          value={formatNAD(overview.amountRepaid)}
          hint="Completed payments"
          icon={<CircleDollarSign className="h-6 w-6" />}
        />
        <StatCard
          testId="tenant-overview-book-value"
          label="Book value"
          value={formatNAD(overview.bookValue)}
          hint="Outstanding on funded and active"
          icon={<Wallet className="h-6 w-6" />}
        />
      </div>
    </div>
  );
};

export default TenantOverviewPage;
