/**
 * Re-export of the Convex generated API.
 * Import this instead of referencing _generated/api directly,
 * so there's a single import path to update if the generated path ever changes.
 *
 * Usage:
 *   import { api } from '@/integrations/convex/api';
 *   const role = useQuery(api.users.getMyRole);
 *   const loan = useMutation(api.loans.createLoan);
 *
 * Note: This file is valid only AFTER running `npx convex dev` which generates
 * convex/_generated/api.d.ts and convex/_generated/api.js
 */

export { api } from '../../../convex/_generated/api';
export { internal } from '../../../convex/_generated/api';
