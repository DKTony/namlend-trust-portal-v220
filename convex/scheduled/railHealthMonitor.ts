/**
 * Rail Health Monitor -- periodic health check for payment rails.
 *
 * Runs every 5 minutes via cron. For each active/degraded rail, performs
 * a health check and updates status accordingly.
 *
 * In production, this would ping actual rail endpoints. Currently uses
 * a simulated check (all rails healthy) as a framework for when real
 * transport adapters are connected.
 */

import { internal } from '../_generated/api';
import { internalAction, internalQuery } from '../_generated/server';

/**
 * Internal query to get rails needing health monitoring.
 */
export const getMonitoredRails = internalQuery({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query('paymentRails')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
    const degraded = await ctx.db
      .query('paymentRails')
      .withIndex('by_status', (q) => q.eq('status', 'degraded'))
      .collect();
    return [...active, ...degraded];
  },
});

/**
 * Check health of all active and degraded payment rails.
 * Called by cron every 5 minutes.
 */
export const checkRailHealth = internalAction({
  args: {},
  handler: async (ctx) => {
    const rails = await ctx.runQuery(internal.scheduled.railHealthMonitor.getMonitoredRails);

    for (const rail of rails) {
      // Simulate health check -- in production, this would:
      //   - IPS: ping Namclear API /health endpoint
      //   - bank_transfer: check EFT gateway status
      //   - mobile_money: check MTC/TN API availability
      //   - cash/cheque: always healthy (offline rails)
      const healthResult = simulateHealthCheck(rail.railCode);

      // Determine if status should change
      let newStatus: 'active' | 'degraded' | 'offline' | undefined;
      if (healthResult.healthy && rail.status === 'degraded') {
        newStatus = 'active'; // Recovered
      } else if (!healthResult.healthy && rail.status === 'active') {
        newStatus = 'degraded'; // Degraded
      }

      await ctx.runMutation(internal.ontology.paymentRails.updateRailHealth, {
        railId: rail._id,
        healthStatus: healthResult.status,
        newStatus,
      });
    }
  },
});

/**
 * Simulated health check. Replace with real endpoint checks in production.
 */
function simulateHealthCheck(railCode: string): { healthy: boolean; status: string } {
  // Offline rails are always healthy
  if (railCode === 'cash' || railCode === 'cheque') {
    return { healthy: true, status: 'healthy' };
  }

  // For electronic rails, simulate healthy status
  // In production: fetch(`${railEndpoints[railCode]}/health`)
  return { healthy: true, status: 'healthy' };
}
