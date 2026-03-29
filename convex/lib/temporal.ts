/**
 * Temporal query helpers — enables "as of" queries for configurations and snapshots.
 *
 * Two concepts:
 *   1. effectiveAt() — "What configuration was active at time T?"
 *      Uses effectiveFrom/effectiveTo fields on temporally-versioned records.
 *   2. nearestSnapshot() — "What was the state captured closest to date D?"
 *      Retrieves the nearest snapshot before a given date.
 *
 * These are pure utility functions that operate on arrays of records.
 * Queries are responsible for fetching the records first.
 */

/**
 * A record with temporal effective dating.
 */
interface TemporalRecord {
  effectiveFrom?: number;
  effectiveTo?: number;
  [key: string]: unknown;
}

/**
 * Given a set of temporally-versioned records, find the one effective at a point in time.
 * Returns the record where effectiveFrom <= asOf < effectiveTo (or effectiveTo is undefined).
 * If multiple match (shouldn't happen with correct versioning), returns the most recent.
 */
export function effectiveAt<T extends TemporalRecord>(records: T[], asOf: number): T | undefined {
  const matching = records.filter((r) => {
    const from = r.effectiveFrom ?? 0;
    const to = r.effectiveTo ?? Infinity;
    return from <= asOf && asOf < to;
  });

  if (matching.length === 0) return undefined;

  // If multiple match, take the one with the latest effectiveFrom
  return matching.sort((a, b) => (b.effectiveFrom ?? 0) - (a.effectiveFrom ?? 0))[0];
}

/**
 * Given a set of temporally-versioned records for a key, get the currently active one.
 * This is effectiveAt(records, Date.now()) — a convenience alias.
 */
export function currentlyEffective<T extends TemporalRecord>(records: T[]): T | undefined {
  return effectiveAt(records, Date.now());
}

/**
 * A snapshot record.
 */
interface SnapshotRecord {
  snapshotDate: string; // "YYYY-MM-DD"
  data: unknown;
  [key: string]: unknown;
}

/**
 * Find the nearest snapshot on or before a given date.
 */
export function nearestSnapshot<T extends SnapshotRecord>(
  snapshots: T[],
  asOfDate: string // "YYYY-MM-DD"
): T | undefined {
  const matching = snapshots
    .filter((s) => s.snapshotDate <= asOfDate)
    .sort((a, b) => (b.snapshotDate > a.snapshotDate ? 1 : -1));

  return matching[0];
}

/**
 * Format a timestamp as "YYYY-MM-DD" string for snapshot dates.
 */
export function toSnapshotDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Check if a temporal record is currently active (no effectiveTo or effectiveTo in future).
 */
export function isCurrentlyActive(record: TemporalRecord): boolean {
  return record.effectiveTo === undefined || record.effectiveTo > Date.now();
}
