/**
 * Support Console — placeholder (Phase 3).
 *
 * Platform-staff management (assign/suspend support agents) and audited tenant impersonation
 * land in Phase 4. The backend already has the guarded mutations (`assignPlatformAdmin`,
 * `suspendPlatformAdmin`) and the `supportAccessAudit` table.
 */

import React from 'react';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { LifeBuoy } from 'lucide-react';

const PlatformSupport: React.FC = () => {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Support Console</h2>
        <p className="text-sm text-muted-foreground">
          Platform staff management &amp; tenant support.
        </p>
      </div>
      <ThemedCard className="flex items-start gap-3">
        <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-medium">Coming in Phase 4</p>
          <p className="mt-1 text-muted-foreground">
            Manage platform support staff and perform audited, time-boxed tenant access. The
            control-plane primitives (<code>platformAdmins</code>, <code>supportAccessAudit</code>)
            already exist; this surface wires the owner-guarded mutations to UI.
          </p>
        </div>
      </ThemedCard>
    </div>
  );
};

export default PlatformSupport;
