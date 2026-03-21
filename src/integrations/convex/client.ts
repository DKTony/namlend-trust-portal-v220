/**
 * Convex React client — singleton for the whole app.
 * Replaces src/integrations/supabase/client.ts for data operations.
 *
 * URL is read from VITE_CONVEX_URL (added to .env and .env.example).
 * The Convex client handles authentication tokens automatically when
 * wrapped with <ConvexAuthProvider>.
 */

import { ConvexReactClient } from 'convex/react';

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

if (!convexUrl) {
  throw new Error(
    'VITE_CONVEX_URL is not set. Add it to your .env file.\n' +
      'Get it from: npx convex dev → dashboard URL shown in output.'
  );
}

export const convex = new ConvexReactClient(convexUrl);
