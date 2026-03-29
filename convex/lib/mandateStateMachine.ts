/**
 * Mandate State Machine — transition validation and reference generation.
 *
 * Ontology: Rule primitive — governs mandate lifecycle transitions.
 *
 * Valid transitions:
 *   draft -> pending_authorization
 *   pending_authorization -> active | revoked
 *   active -> suspended | revoked | expired
 *   suspended -> active | revoked
 *
 * Terminal states: revoked, expired (no transitions out)
 */

/** All valid mandate statuses */
export type MandateStatus =
  | 'draft'
  | 'pending_authorization'
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'expired';

/** Map of valid transitions: from -> [allowed targets] */
const VALID_TRANSITIONS: Record<MandateStatus, MandateStatus[]> = {
  draft: ['pending_authorization'],
  pending_authorization: ['active', 'revoked'],
  active: ['suspended', 'revoked', 'expired'],
  suspended: ['active', 'revoked'],
  revoked: [], // terminal
  expired: [], // terminal
};

/** Terminal states — no further transitions allowed */
const TERMINAL_STATES: MandateStatus[] = ['revoked', 'expired'];

/**
 * Validate whether a mandate state transition is allowed.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateMandateTransition(
  from: MandateStatus,
  to: MandateStatus
): { valid: true } | { valid: false; reason: string } {
  if (TERMINAL_STATES.includes(from)) {
    return {
      valid: false,
      reason: `Cannot transition from terminal state "${from}"`,
    };
  }

  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return {
      valid: false,
      reason: `Invalid transition: "${from}" -> "${to}". Allowed: [${(allowed ?? []).join(', ')}]`,
    };
  }

  return { valid: true };
}

/**
 * Check if a mandate status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: MandateStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

/**
 * Check if a mandate is in an executable state (can process debits).
 */
export function isExecutableStatus(status: MandateStatus): boolean {
  return status === 'active';
}

/**
 * Generate a unique mandate reference.
 * Format: MDT-{YYYYMMDD}-{random6}
 */
export function generateMandateRef(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDT-${date}-${rand}`;
}

/**
 * Calculate the next execution date based on frequency and collection day.
 */
export function calculateNextExecutionDate(
  frequency: 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly',
  collectionDay: number | undefined,
  lastExecutionDate?: number
): number {
  const base = lastExecutionDate ? new Date(lastExecutionDate) : new Date();

  switch (frequency) {
    case 'once':
      // Once-off mandates don't have a "next" execution
      return 0;

    case 'weekly': {
      const next = new Date(base);
      next.setDate(next.getDate() + 7);
      return next.getTime();
    }

    case 'fortnightly': {
      const next = new Date(base);
      next.setDate(next.getDate() + 14);
      return next.getTime();
    }

    case 'monthly': {
      const next = new Date(base);
      next.setMonth(next.getMonth() + 1);
      if (collectionDay) {
        // Clamp to valid day for the month
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(collectionDay, maxDay));
      }
      return next.getTime();
    }

    case 'quarterly': {
      const next = new Date(base);
      next.setMonth(next.getMonth() + 3);
      if (collectionDay) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(collectionDay, maxDay));
      }
      return next.getTime();
    }

    default:
      return 0;
  }
}
