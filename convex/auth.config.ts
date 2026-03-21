/**
 * Convex Auth Config — required default export for Convex platform.
 * This file declares the provider list for the Convex auth analyzer.
 * The full implementation (afterUserCreatedOrUpdated callback, etc.) lives in auth.ts.
 */

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
};
