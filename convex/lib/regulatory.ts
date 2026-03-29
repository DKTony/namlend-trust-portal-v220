/**
 * Regulatory constants — server-side copy for Convex mutations.
 * Mirrors src/constants/regulatory.ts exactly.
 * Import this in every mutation that accepts an interestRate.
 *
 * The hardcoded APR_LIMIT (32) is the fallback. When businessRules are seeded,
 * getAPRLimit() reads the data-driven value instead.
 */

import { GenericQueryCtx, GenericMutationCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';
import { getNumericRule } from './ruleEvaluator';

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/** Maximum APR allowed by Namibian regulations (NBFI Act) — hardcoded fallback */
export const APR_LIMIT = 32;

export const CURRENCY_CODE = 'NAD';
export const CURRENCY_SYMBOL = 'N$';

/**
 * Returns true only if the APR is positive and does not exceed Namibian legal limit.
 * Use this guard in every loan create / update mutation.
 */
export function isValidAPR(apr: number): boolean {
  return apr > 0 && apr <= APR_LIMIT;
}

/**
 * Async version that reads APR_LIMIT from businessRules table,
 * falling back to the hardcoded constant if not seeded.
 */
export async function getAPRLimit(ctx: Ctx): Promise<number> {
  return getNumericRule(ctx, 'APR_LIMIT', APR_LIMIT);
}

/**
 * Async APR validation that reads the limit from businessRules.
 */
export async function isValidAPRAsync(ctx: Ctx, apr: number): Promise<boolean> {
  const limit = await getAPRLimit(ctx);
  return apr > 0 && apr <= limit;
}

/** Format a NAD amount with N$ prefix and 2dp — for display in server-generated strings */
export function formatNAD(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
