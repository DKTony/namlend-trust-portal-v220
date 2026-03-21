/**
 * Convex API return type utilities.
 *
 * Use `FunctionReturnType` to extract the return type of any Convex query or mutation.
 * This eliminates `as any` casts on `useQuery` / `useMutation` results.
 *
 * Usage:
 *   import type { QueryReturn } from '@/types/convex';
 *   const data: QueryReturn<typeof api.analytics.getPortfolioSummary> | undefined = useQuery(api.analytics.getPortfolioSummary, {});
 *
 * For Id types:
 *   import type { Id } from '@/types/convex';
 *   await mutation({ loanId: someString as Id<'loans'> });
 */

import type { FunctionReturnType } from 'convex/server';

export type { Id } from '../../convex/_generated/dataModel';
export type { Doc } from '../../convex/_generated/dataModel';

/** Extract the return type of a Convex query or mutation function reference. */
export type QueryReturn<T extends { _returnType: unknown }> = FunctionReturnType<T>;

/** Non-null version — use after confirming data is loaded (not undefined). */
export type QueryData<T extends { _returnType: unknown }> = NonNullable<FunctionReturnType<T>>;

/** Array element type — use when a query returns an array. */
export type QueryItem<T extends { _returnType: unknown }> =
  FunctionReturnType<T> extends (infer U)[] ? U : never;
