/**
 * Which sign-in providers this deployment can actually serve.
 *
 * The Google credentials are Convex env vars (server-side), so the browser cannot
 * read them. A `VITE_` mirror would ship to the client and silently drift from the
 * deployment it is pointed at — this query keeps the button and the backend in sync
 * by construction, and makes rollout/rollback a matter of setting or removing an env
 * var, with no redeploy.
 *
 * Unauthenticated by design: the sign-in page reads it before any session exists, and
 * it returns booleans only — no credential material crosses the wire.
 */

import { query } from './_generated/server';

export const listEnabled = query({
  args: {},
  handler: async () => ({
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  }),
});
