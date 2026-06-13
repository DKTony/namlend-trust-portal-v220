/**
 * Tenant context resolution — the data-plane tenancy boundary.
 *
 * Phase 0 (this file) only *resolves* the caller's tenant; it does NOT yet enforce
 * row-level isolation (that is Phase 1, where tenant-scoped data-access helpers will own
 * the `withIndex('by_institutionId', …)` so feature modules cannot write raw cross-tenant
 * queries). Resolution is tolerant of an unbound account during the transition.
 */

import { ConvexError } from 'convex/values';
import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { assertAuthenticated } from './auth';
import { getBooleanRule } from './ruleEvaluator';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;
type MutCtx = GenericMutationCtx<DataModel>;

export interface TenantContext {
  userId: Id<'users'>;
  role: string | null;
  /** Bound tenant, or null if the account is not yet bound (transition state). */
  institutionId: Id<'institutions'> | null;
}

/**
 * Resolve the caller's tenant context from `userRoles`. Never throws on a missing tenant
 * binding (Phase 0) — returns `institutionId: null` so callers can phase in enforcement.
 */
export async function getCallerInstitution(ctx: AnyCtx): Promise<TenantContext> {
  const userId = await assertAuthenticated(ctx);
  const roleDoc = await ctx.db
    .query('userRoles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
  return {
    userId,
    role: (roleDoc?.role as string | undefined) ?? null,
    institutionId: roleDoc?.institutionId ?? null,
  };
}

/**
 * Like `getCallerInstitution` but requires a bound tenant. Use this in Phase 1+ on paths
 * that must be tenant-scoped. In Phase 0 most callers use the tolerant variant above.
 */
export async function requireTenantContext(
  ctx: AnyCtx
): Promise<TenantContext & { institutionId: Id<'institutions'> }> {
  const tenant = await getCallerInstitution(ctx);
  if (!tenant.institutionId) {
    throw new ConvexError({
      code: 'TENANT_CONTEXT_REQUIRED',
      message: 'Your account is not bound to a tenant.',
    });
  }
  return { ...tenant, institutionId: tenant.institutionId };
}

// ---------------------------------------------------------------------------
// Phase 1a — enforcement (flag-gated) + stamp-on-write + scope-on-read
// ---------------------------------------------------------------------------

/**
 * Is row-level tenant isolation switched on? Gated by the `TENANCY_ENFORCEMENT` businessRule
 * (default false). While off, the stamping/scoping helpers below are INERT so production
 * behaves identically — the owner flips this after backfill + verification.
 */
export async function isTenancyEnforced(ctx: AnyCtx): Promise<boolean> {
  return getBooleanRule(ctx, 'TENANCY_ENFORCEMENT', false);
}

/** Returns the single institution id if exactly one tenant exists, else null. */
async function soleInstitution(ctx: AnyCtx): Promise<Id<'institutions'> | null> {
  const two = await ctx.db.query('institutions').take(2);
  // Ignore non-tenant institutions (e.g. BON regulator) by preferring a 'lender'.
  const lenders = two.filter((i) => i.type === 'lender');
  if (lenders.length === 1) return lenders[0]._id;
  return two.length === 1 ? two[0]._id : null;
}

/** Look up a user's bound tenant from their userRoles row. */
async function institutionForUser(
  ctx: AnyCtx,
  userId: Id<'users'>
): Promise<Id<'institutions'> | null> {
  const roleDoc = await ctx.db
    .query('userRoles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
  return roleDoc?.institutionId ?? null;
}

/**
 * Resolve the `institutionId` to stamp on a new row.
 * Priority: parent loan → parent mandate → target user's tenant → caller's tenant → sole tenant.
 * Returns `undefined` (leave column null; backfill handles) only when not enforcing and
 * nothing resolves; throws `TENANT_CONTEXT_REQUIRED` when enforcing and unresolved.
 */
export async function resolveWriteInstitution(
  ctx: MutCtx,
  opts: { loanId?: Id<'loans'>; mandateId?: Id<'mandates'>; userId?: Id<'users'> } = {}
): Promise<Id<'institutions'> | undefined> {
  // 1. Parent loan — works for user AND system writes (webhooks/crons have no caller).
  if (opts.loanId) {
    const loan = await ctx.db.get(opts.loanId);
    if (loan?.institutionId) return loan.institutionId;
  }
  // 2. Parent mandate.
  if (opts.mandateId) {
    const mandate = await ctx.db.get(opts.mandateId);
    if (mandate?.institutionId) return mandate.institutionId;
    if (mandate?.loanId) {
      const loan = await ctx.db.get(mandate.loanId);
      if (loan?.institutionId) return loan.institutionId;
    }
  }
  // 3. The target user the row belongs to (e.g. a notification for a borrower).
  if (opts.userId) {
    const inst = await institutionForUser(ctx, opts.userId);
    if (inst) return inst;
  }
  // 4. Caller's bound tenant (best-effort; system writes have no auth).
  try {
    const callerId = await assertAuthenticated(ctx);
    const inst = await institutionForUser(ctx, callerId);
    if (inst) return inst;
  } catch {
    // unauthenticated system context — fall through
  }
  // 5. Sole-tenant transition fallback.
  const sole = await soleInstitution(ctx);
  if (sole) return sole;

  if (await isTenancyEnforced(ctx)) {
    throw new ConvexError({
      code: 'TENANT_CONTEXT_REQUIRED',
      message: 'Cannot resolve a tenant for this write.',
    });
  }
  return undefined;
}

/**
 * The institution to filter reads by, or `null` when enforcement is off (no filtering).
 * Staff list queries pass results through `applyTenantScope` with this value.
 */
export async function tenantReadScope(ctx: AnyCtx): Promise<Id<'institutions'> | null> {
  if (!(await isTenancyEnforced(ctx))) return null;
  const tenant = await getCallerInstitution(ctx);
  return tenant.institutionId;
}

/**
 * Filter a fetched array to a tenant scope. No-op when `scope` is null (enforcement off).
 * Rows with a null `institutionId` (un-backfilled legacy) are treated as belonging to the
 * scope so enforcement never hides not-yet-stamped data from the sole tenant.
 */
export function applyTenantScope<T extends { institutionId?: Id<'institutions'> }>(
  rows: T[],
  scope: Id<'institutions'> | null
): T[] {
  if (!scope) return rows;
  return rows.filter((r) => r.institutionId === undefined || r.institutionId === scope);
}

/**
 * Defense-in-depth single-row check: throws if enforcement is on and the row belongs to a
 * different tenant. No-op when off or when the row is unstamped legacy data.
 */
export function assertSameTenant(
  scope: Id<'institutions'> | null,
  rowInstitutionId: Id<'institutions'> | undefined
): void {
  if (!scope || rowInstitutionId === undefined) return;
  if (rowInstitutionId !== scope) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this resource.',
    });
  }
}
