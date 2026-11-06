/**
 * Human-facing reference numbers — client numbers and loan numbers.
 *
 * These are not internal keys. They are printed on the loan agreement (Schedule A
 * "Client No." and "Loan reference") and quoted by borrowers on the phone, so they
 * must be short, sequential-looking, unique and permanent once issued.
 *
 * WHY A COUNTER TABLE
 * -------------------
 * The obvious alternatives both fail for a number that lands on an executed contract:
 *   - counting rows (`.collect().length`) is O(n) and races: two concurrent signups
 *     both read 41 and both become client 000042;
 *   - deriving from the document id or timestamp (the `makeReceiptNumber` approach in
 *     `ippOperations.ts`) is contention-free but produces opaque strings — fine for a
 *     per-transaction receipt, wrong for "Client No." on a signed agreement.
 *
 * `sequenceCounters` holds one row per (institution, name). Convex runs mutations under
 * optimistic concurrency: two allocations in the same instant conflict on that row and
 * the loser is retried transparently, so they serialise instead of colliding. That is a
 * real throughput ceiling on one document, which is why this is used ONLY for the two
 * low-rate, human-visible sequences and never for payment or transaction references.
 *
 * Allocation is not transaction-safe against rollback: a mutation that allocates and
 * then throws leaves a consumed number. Gaps are therefore expected and harmless —
 * uniqueness and monotonicity are the guarantees, not density.
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel, Doc, Id } from '../_generated/dataModel';

type MutCtx = GenericMutationCtx<DataModel>;

export type SequenceName = 'clientNumber' | 'loanNumber';

/**
 * Namibia is UTC+2 year-round — it abolished DST in 2017 (Namibia Time Act 9 of 2017).
 * A fixed offset keeps the year stamp on a loan number deterministic without depending
 * on ICU timezone data being present in the Convex runtime.
 */
const NAMIBIA_UTC_OFFSET_MS = 2 * 60 * 60 * 1000;

/** The calendar year in Namibian local time for a UTC timestamp. */
export function namibianYear(timestamp: number): number {
  return new Date(timestamp + NAMIBIA_UTC_OFFSET_MS).getUTCFullYear();
}

/**
 * Consume and return the next value of a named sequence. Creates the counter on first
 * use. Callers must treat the returned number as spent even if they later fail.
 */
export async function allocateSequence(
  ctx: MutCtx,
  name: SequenceName,
  institutionId: Id<'institutions'> | undefined
): Promise<number> {
  const counter = await ctx.db
    .query('sequenceCounters')
    .withIndex('by_institution_name', (q) => q.eq('institutionId', institutionId).eq('name', name))
    .first();

  const now = Date.now();
  if (!counter) {
    await ctx.db.insert('sequenceCounters', {
      institutionId,
      name,
      nextValue: 2,
      updatedAt: now,
    });
    return 1;
  }

  await ctx.db.patch(counter._id, { nextValue: counter.nextValue + 1, updatedAt: now });
  return counter.nextValue;
}

/** Schedule A prints a bare zero-padded number, e.g. `000001`. */
export function formatClientNumber(sequence: number): string {
  return String(sequence).padStart(6, '0');
}

/**
 * Loan reference, e.g. `OGFS-2026-000123`. The prefix comes from
 * `institutions.shortCode` so a second tenant does not inherit the first one's
 * branding; untenanted loans fall back to `LN`.
 */
export function formatLoanNumber(
  shortCode: string | undefined,
  sequence: number,
  timestamp: number
): string {
  const prefix = (shortCode ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'LN';
  return `${prefix}-${namibianYear(timestamp)}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Return the profile's client number, allocating one if it has none.
 *
 * Idempotent and safe to call on every read-ish path that needs the number — an
 * existing number is never replaced, because it is already printed on issued
 * agreements.
 */
export async function ensureClientNumber(ctx: MutCtx, profile: Doc<'profiles'>): Promise<string> {
  if (profile.clientNumber) return profile.clientNumber;

  const sequence = await allocateSequence(ctx, 'clientNumber', profile.institutionId);
  const clientNumber = formatClientNumber(sequence);
  await ctx.db.patch(profile._id, { clientNumber, updatedAt: Date.now() });
  return clientNumber;
}

/** Allocate the next loan reference for an institution. */
export async function allocateLoanNumber(
  ctx: MutCtx,
  institutionId: Id<'institutions'> | undefined
): Promise<string> {
  const institution = institutionId ? await ctx.db.get(institutionId) : null;
  const sequence = await allocateSequence(ctx, 'loanNumber', institutionId);
  return formatLoanNumber(institution?.shortCode, sequence, Date.now());
}
