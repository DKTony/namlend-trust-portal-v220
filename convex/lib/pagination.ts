/**
 * Cursor-based pagination helpers for Convex queries.
 *
 * Convex natively supports cursor pagination via query.paginate().
 * These helpers standardise page size defaults and cursor encoding
 * across all list queries in the API.
 */

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export interface PaginationArgs {
  cursor?: string | null;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  isDone: boolean;
  continueCursor: string;
}

/**
 * Normalise the limit argument: clamp to [1, MAX_PAGE_SIZE].
 */
export function resolveLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}
