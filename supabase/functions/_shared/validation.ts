/**
 * Input Validation with Zod
 * Ensures all API inputs are validated before processing
 */

import { z } from 'https://esm.sh/zod@3.22.4';

// Regulatory constants
export const MAX_APR_NAMIBIA = 0.32; // 32% maximum APR
export const CURRENCY_CODE = 'NAD';
export const MIN_LOAN_AMOUNT = 500;
export const MAX_LOAN_AMOUNT = 500000;

// Common schemas
export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Loan schemas
export const loanStatusSchema = z.enum([
  'pending',
  'under_review',
  'approved',
  'rejected',
  'disbursed',
  'active',
  'completed',
  'defaulted',
  'restructured',
]);

export const loanApplicationSchema = z.object({
  amount: z.number().min(MIN_LOAN_AMOUNT).max(MAX_LOAN_AMOUNT),
  term_months: z.number().int().min(1).max(60),
  purpose: z.string().min(10).max(500),
  interest_rate: z.number().min(0).max(MAX_APR_NAMIBIA),
  employment_status: z.enum(['employed', 'self_employed', 'unemployed', 'retired']),
  monthly_income: z.number().min(0),
});

export const loanApprovalSchema = z.object({
  loan_id: uuidSchema,
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
  approved_amount: z.number().min(MIN_LOAN_AMOUNT).max(MAX_LOAN_AMOUNT).optional(),
  approved_rate: z.number().min(0).max(MAX_APR_NAMIBIA).optional(),
});

// User schemas
export const userRoleSchema = z.enum(['admin', 'loan_officer', 'client', 'approver']);

export const userUpdateSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+264[0-9]{9}$/, 'Invalid Namibian phone number')
    .optional(),
  id_number: z.string().optional(),
});

// Payment schemas
export const paymentMethodSchema = z.enum(['bank_transfer', 'mobile_money', 'cash', 'debit_order']);

export const paymentSchema = z.object({
  loan_id: uuidSchema,
  amount: z.number().positive(),
  payment_method: paymentMethodSchema,
  reference: z.string().max(100).optional(),
});

export const disbursementSchema = z.object({
  loan_id: uuidSchema,
  payment_method: paymentMethodSchema,
  payment_reference: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
});

// Accept a single status OR a comma-separated list of statuses (e.g. "pending,under_review")
export const loanStatusFilterSchema = z
  .string()
  .transform((val) => val.split(',').map((s) => s.trim()))
  .pipe(z.array(loanStatusSchema).min(1));

// List/filter schemas
export const loanListSchema = z.object({
  status: loanStatusFilterSchema.optional(),
  user_id: uuidSchema.optional(),
  assigned_officer_id: uuidSchema.optional(),
  ...paginationSchema.shape,
  ...dateRangeSchema.shape,
});

export const paymentListSchema = z.object({
  loan_id: uuidSchema.optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'reversed']).optional(),
  ...paginationSchema.shape,
  ...dateRangeSchema.shape,
});

/**
 * Validate request body against schema
 */
export async function validateBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: errors.join('; ') };
    }

    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: 'Invalid JSON body' };
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(
  url: URL,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const params: Record<string, unknown> = {};

  url.searchParams.forEach((value, key) => {
    // Try to parse numbers
    const num = Number(value);
    if (!isNaN(num) && value !== '') {
      params[key] = num;
    } else if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else {
      params[key] = value;
    }
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return { success: false, error: errors.join('; ') };
  }

  return { success: true, data: result.data };
}

/**
 * Validate APR against Namibian regulatory limit
 */
export function validateAPR(rate: number): { valid: boolean; error?: string } {
  if (rate > MAX_APR_NAMIBIA) {
    return {
      valid: false,
      error: `APR ${(rate * 100).toFixed(2)}% exceeds Namibian legal limit of ${MAX_APR_NAMIBIA * 100}%`,
    };
  }
  return { valid: true };
}
