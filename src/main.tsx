import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Development-time debug tooling gates
if (import.meta.env.DEV) {
  const isE2E = import.meta.env.VITE_E2E === 'true';
  const debugToolsEnabled = import.meta.env.VITE_DEBUG_TOOLS === 'true' && !isE2E;
  const legacyAdminEnabled = import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true' && !isE2E;
  const runDevScripts = import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true' && !isE2E;

  // Only load debug window tools when explicitly enabled and not under E2E
  if (debugToolsEnabled || legacyAdminEnabled) {
    import('./utils/supabaseDebug').then(() => {
      console.log('Supabase debug tools initialized');
    });
    if (legacyAdminEnabled && !debugToolsEnabled) {
      console.warn('⚠️  VITE_ALLOW_LOCAL_ADMIN is deprecated. Use VITE_DEBUG_TOOLS instead.');
    }
  } else {
    console.log('Debug tools disabled. Set VITE_DEBUG_TOOLS="true" to enable.');
  }

  // Gate heavier auto-running scripts to avoid interfering with sign-in/out flows
  if (runDevScripts) {
    // Safe, anon-client-only scripts
    import('./utils/testLoanApproval');
    import('./utils/createSampleLoans');
    import('./utils/createSampleApprovalRequests');
    import('./utils/createTestUser');
    // Import utilities for development and debugging
    import('./utils/checkDatabase');
    import('./utils/assignRoleDirectly');
    import('./utils/serviceRoleAssignment');
    import('./utils/testRoleAssignment');
    import('./utils/testSignOut');

    if (debugToolsEnabled || legacyAdminEnabled) {
      import('./utils/testSupabaseAccess');
      import('./utils/testPasswordResetConsole');
      import('./utils/resetUserPassword');
      import('./utils/directPasswordReset');
      import('./utils/manualPasswordReset');
      import('./utils/debugServiceKey');
      import('./utils/createAdminUser');
      import('./utils/setupUserRole');
    } else {
      console.log('Admin-level dev utilities disabled. Set VITE_DEBUG_TOOLS="true" to enable.');
    }
  } else {
    console.log('Dev auto-scripts disabled. Set VITE_RUN_DEV_SCRIPTS="true" to enable.');
    // Do not import any dev utilities when auto-scripts are disabled
  }
}

import './index.css';

createRoot(document.getElementById("root")!).render(<App />);

