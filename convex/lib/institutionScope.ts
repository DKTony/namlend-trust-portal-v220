/**
 * Institution scoping -- tenant isolation helpers for multi-institution queries.
 *
 * Usage:
 *   const loans = await withInstitution(results, institutionId);
 *
 * These are pure filter functions that narrow result sets by institutionId.
 * They work with the optional institutionId field pattern -- records without
 * an institutionId are treated as "unscoped" (visible to all institutions
 * until backfill runs).
 */

/**
 * Filter records by institutionId.
 * If institutionId is undefined/null, returns all records (no scoping).
 * Records without an institutionId pass through (backward-compatible).
 */
export function withInstitution<T extends { institutionId?: string | null }>(
  records: T[],
  institutionId: string | undefined | null
): T[] {
  if (!institutionId) return records;
  return records.filter((r) => !r.institutionId || r.institutionId === institutionId);
}

/**
 * Check if a single record belongs to an institution.
 * Returns true if:
 *   - No scoping requested (institutionId is null/undefined)
 *   - Record has no institutionId (unscoped/legacy)
 *   - Record's institutionId matches
 */
export function belongsToInstitution<T extends { institutionId?: string | null }>(
  record: T,
  institutionId: string | undefined | null
): boolean {
  if (!institutionId) return true;
  if (!record.institutionId) return true;
  return record.institutionId === institutionId;
}
