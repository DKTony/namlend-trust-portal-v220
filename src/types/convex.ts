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

import type { FunctionReference, FunctionReturnType } from 'convex/server';

export type { Doc, Id } from '../../convex/_generated/dataModel';

/** Extract the return type of a Convex query or mutation function reference. */
type AnyConvexFunction = FunctionReference<'query' | 'mutation' | 'action'>;

export type QueryReturn<T extends AnyConvexFunction> = FunctionReturnType<T>;

/** Non-null version — use after confirming data is loaded (not undefined). */
export type QueryData<T extends AnyConvexFunction> = NonNullable<FunctionReturnType<T>>;

/** Array element type — use when a query returns an array. */
export type QueryItem<T extends AnyConvexFunction> =
  FunctionReturnType<T> extends (infer U)[] ? U : never;
