/**
 * Feature manifest — frontend re-export.
 *
 * The CANONICAL manifest lives at `convex/lib/features.ts` so the Convex backend guards
 * (which cannot import from `src/`) and the frontend nav/route gating share ONE source of
 * truth and can never drift. Frontend code imports from here (`@/config/features`).
 */
export * from '../../convex/lib/features';
