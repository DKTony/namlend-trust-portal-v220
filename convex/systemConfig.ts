/**
 * System Configuration — key/value store for runtime settings.
 * Replaces the system_configuration table Supabase queries.
 * All writes require admin role; reads require staff.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { scheduleAuditEntry, scheduleAuditLog } from './lib/audit';
import { assertTenantAdmin } from './lib/auth';
import { assertCallerFeatureEnabled } from './lib/entitlements';
import {
  assertAdminOrPlatformOwner,
  assertPlatformOwner,
  assertPlatformSupport,
  assertStaffOrPlatformSupport,
} from './lib/platformAuth';
import { requireTenantContext } from './lib/tenancy';

function isBrandingConfig(key?: string, category?: string): boolean {
  return category === 'branding' || key?.startsWith('branding.') === true;
}

const TENANT_BRANDING_KEY = 'branding.config';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_FAVICON_BYTES = 512 * 1024;
const ALLOWED_BRANDING_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const brandingGeneralValidator = v.object({
  company_name: v.string(),
  company_tagline: v.string(),
  support_email: v.string(),
  support_phone: v.string(),
});
const brandingColorsValidator = v.object({
  primary_color: v.string(),
  secondary_color: v.string(),
  accent_color: v.string(),
  use_custom_colors: v.boolean(),
});
const brandingAssetsValidator = v.object({
  logoStorageId: v.union(v.id('_storage'), v.null()),
  faviconStorageId: v.union(v.id('_storage'), v.null()),
  logo_width: v.number(),
  logo_height: v.number(),
  show_company_name_with_logo: v.boolean(),
});
const brandingMetaValidator = v.object({
  page_title_template: v.string(),
  meta_description: v.string(),
  og_image_url: v.union(v.string(), v.null()),
});

function assertText(value: string, label: string, maxLength: number): void {
  if (!value.trim() || value.length > maxLength || /[<>]/.test(value)) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `${label} must be plain text between 1 and ${maxLength} characters.`,
    });
  }
}

function assertBrandingValues(args: {
  general: {
    company_name: string;
    company_tagline: string;
    support_email: string;
    support_phone: string;
  };
  colors: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    use_custom_colors: boolean;
  };
  assets: { logo_width: number; logo_height: number; show_company_name_with_logo: boolean };
  meta: { page_title_template: string; meta_description: string; og_image_url: string | null };
}): void {
  assertText(args.general.company_name, 'Company name', 100);
  assertText(args.general.company_tagline, 'Company tagline', 160);
  assertText(args.general.support_email, 'Support email', 254);
  assertText(args.general.support_phone, 'Support phone', 40);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.general.support_email)) {
    throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Support email is invalid.' });
  }
  for (const color of [
    args.colors.primary_color,
    args.colors.secondary_color,
    args.colors.accent_color,
  ]) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Brand colors must use six-digit hexadecimal values.',
      });
    }
  }
  if (args.assets.logo_width < 40 || args.assets.logo_width > 300) {
    throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Logo width must be 40–300px.' });
  }
  if (args.assets.logo_height < 20 || args.assets.logo_height > 100) {
    throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Logo height must be 20–100px.' });
  }
  assertText(args.meta.page_title_template, 'Page title template', 120);
  assertText(args.meta.meta_description, 'Meta description', 320);
  if (args.meta.og_image_url && !args.meta.og_image_url.startsWith('/')) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'Open Graph image must be a trusted bundled asset path.',
    });
  }
}

async function validateBrandAsset(
  ctx: any,
  storageId: Id<'_storage'> | null,
  maxBytes: number,
  label: string
): Promise<void> {
  if (!storageId) return;
  const metadata = await ctx.db.system.get('_storage', storageId);
  if (!metadata) {
    throw new ConvexError({ code: 'NOT_FOUND', message: `${label} upload was not found.` });
  }
  if (!ALLOWED_BRANDING_MIME_TYPES.has(metadata.contentType ?? '') || metadata.size > maxBytes) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `${label} must be an approved raster image within the size limit.`,
    });
  }
}

function currentInstitutionConfig<T extends { effectiveFrom: number; effectiveTo?: number }>(
  rows: T[],
  now = Date.now()
): T | null {
  return (
    rows
      .filter(
        (row) =>
          row.effectiveFrom <= now && (row.effectiveTo === undefined || row.effectiveTo > now)
      )
      .sort((left, right) => right.effectiveFrom - left.effectiveFrom)[0] ?? null
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get the currently effective configuration for a key.
 * Filters by effectiveFrom/effectiveTo if temporal versioning is active,
 * otherwise falls back to the first matching non-deleted record.
 */
export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    if (isBrandingConfig(key)) await assertPlatformSupport(ctx);
    else await assertStaffOrPlatformSupport(ctx);
    const entries = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', key))
      .collect();

    // Filter out soft-deleted entries
    const active = entries.filter((e) => !e.deletedAt);

    // If temporal versioning is present, find the currently effective record
    const now = Date.now();
    const temporalMatch = active.find((e) => {
      if (e.effectiveFrom === undefined) return true; // Legacy record without temporal fields
      const from = e.effectiveFrom;
      const to = e.effectiveTo ?? Infinity;
      return from <= now && now < to;
    });

    return temporalMatch ?? active[0] ?? null;
  },
});

/**
 * Get all currently effective configurations.
 * Filters out soft-deleted and superseded (effectiveTo in past) records.
 */
export const getAllConfig = query({
  args: {
    category: v.optional(v.string()),
    includeHistory: v.optional(v.boolean()),
  },
  handler: async (ctx, { category, includeHistory }) => {
    if (isBrandingConfig(undefined, category)) await assertPlatformSupport(ctx);
    else await assertStaffOrPlatformSupport(ctx);
    let results = await ctx.db.query('systemConfiguration').collect();

    // Exclude soft-deleted entries
    results = results.filter((c) => !c.deletedAt);

    // Unless history requested, show only currently effective records
    if (!includeHistory) {
      const now = Date.now();
      results = results.filter((c) => {
        if (c.effectiveTo !== undefined && c.effectiveTo <= now) return false;
        return true;
      });
    }

    if (category) {
      results = results.filter((c) => c.category === category);
    }
    return results;
  },
});

/**
 * Get public configuration values. No auth guard because only records explicitly
 * marked isPublic=true are returned.
 */
export const getPublicConfig = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, { category }) => {
    let results = await ctx.db.query('systemConfiguration').collect();
    const now = Date.now();

    results = results.filter((c) => {
      if (!c.isPublic || c.deletedAt) return false;
      if (isBrandingConfig(c.key, c.category)) return false;
      if (c.effectiveTo !== undefined && c.effectiveTo <= now) return false;
      if (category && c.category !== category) return false;
      return true;
    });

    return results;
  },
});

/**
 * Tenant-scoped white-label configuration. Public and unentitled callers never use this query;
 * the frontend falls back to the bundled OG Financial Services identity.
 */
export const getTenantBranding = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await requireTenantContext(ctx);
    await assertCallerFeatureEnabled(ctx, 'whiteLabelBranding');
    const rows = await ctx.db
      .query('institutionConfig')
      .withIndex('by_institution_key', (q) =>
        q.eq('institutionId', tenant.institutionId).eq('key', TENANT_BRANDING_KEY)
      )
      .collect();
    const current = currentInstitutionConfig(rows);
    if (!current) return null;

    const value = current.value as {
      general?: unknown;
      colors?: unknown;
      assets?: {
        logoStorageId?: Id<'_storage'> | null;
        faviconStorageId?: Id<'_storage'> | null;
        logo_width?: number;
        logo_height?: number;
        show_company_name_with_logo?: boolean;
      };
      meta?: unknown;
    };
    const logoStorageId = value.assets?.logoStorageId ?? null;
    const faviconStorageId = value.assets?.faviconStorageId ?? null;
    const [logoUrl, faviconUrl] = await Promise.all([
      logoStorageId ? ctx.storage.getUrl(logoStorageId) : null,
      faviconStorageId ? ctx.storage.getUrl(faviconStorageId) : null,
    ]);

    return {
      config: {
        general: value.general,
        colors: value.colors,
        assets: {
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          logo_width: value.assets?.logo_width,
          logo_height: value.assets?.logo_height,
          show_company_name_with_logo: value.assets?.show_company_name_with_logo,
        },
        meta: value.meta,
      },
      assetStorageIds: {
        logo: logoStorageId,
        favicon: faviconStorageId,
      },
      institutionId: tenant.institutionId,
      version: current.version,
    };
  },
});

export const generateTenantBrandingUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const tenant = await requireTenantContext(ctx);
    await assertTenantAdmin(ctx, tenant.institutionId);
    await assertCallerFeatureEnabled(ctx, 'whiteLabelBranding');
    return ctx.storage.generateUploadUrl();
  },
});

export const saveTenantBranding = mutation({
  args: {
    general: brandingGeneralValidator,
    colors: brandingColorsValidator,
    assets: brandingAssetsValidator,
    meta: brandingMetaValidator,
  },
  handler: async (ctx, args) => {
    const tenant = await requireTenantContext(ctx);
    const userId = await assertTenantAdmin(ctx, tenant.institutionId);
    await assertCallerFeatureEnabled(ctx, 'whiteLabelBranding');
    assertBrandingValues(args);
    await Promise.all([
      validateBrandAsset(ctx, args.assets.logoStorageId, MAX_LOGO_BYTES, 'Logo'),
      validateBrandAsset(ctx, args.assets.faviconStorageId, MAX_FAVICON_BYTES, 'Favicon'),
    ]);

    const now = Date.now();
    const rows = await ctx.db
      .query('institutionConfig')
      .withIndex('by_institution_key', (q) =>
        q.eq('institutionId', tenant.institutionId).eq('key', TENANT_BRANDING_KEY)
      )
      .collect();
    const current = currentInstitutionConfig(rows, now);
    if (current) await ctx.db.patch(current._id, { effectiveTo: now });

    const id = await ctx.db.insert('institutionConfig', {
      institutionId: tenant.institutionId,
      key: TENANT_BRANDING_KEY,
      value: args,
      effectiveFrom: now,
      version: (current?.version ?? 0) + 1,
      updatedBy: userId,
      createdAt: now,
    });
    scheduleAuditEntry(ctx, {
      entityType: 'institutionConfig',
      entityId: String(id),
      action: current ? 'UPDATE_TENANT_BRANDING' : 'CREATE_TENANT_BRANDING',
      oldState: current
        ? { institutionId: tenant.institutionId, version: current.version }
        : undefined,
      newState: {
        institutionId: tenant.institutionId,
        version: (current?.version ?? 0) + 1,
        hasLogo: Boolean(args.assets.logoStorageId),
        hasFavicon: Boolean(args.assets.faviconStorageId),
      },
      userId,
    });
    return id;
  },
});

/**
 * Get configuration value as a typed result.
 * Returns the currently effective value, or null if not found.
 */
export const getConfigValue = query({
  args: {
    key: v.string(),
    asOf: v.optional(v.number()),
  },
  handler: async (ctx, { key, asOf }) => {
    if (isBrandingConfig(key)) await assertPlatformSupport(ctx);
    else await assertStaffOrPlatformSupport(ctx);
    const entries = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', key))
      .collect();

    const active = entries.filter((e) => !e.deletedAt);
    const pointInTime = asOf ?? Date.now();

    const match = active.find((e) => {
      if (e.effectiveFrom === undefined) return true; // Legacy record
      const from = e.effectiveFrom;
      const to = e.effectiveTo ?? Infinity;
      return from <= pointInTime && pointInTime < to;
    });

    return match?.value ?? active[0]?.value ?? null;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Set a configuration value with temporal versioning.
 *
 * Instead of overwriting, this mutation "closes" the old record by setting
 * effectiveTo = now, then inserts a new record with effectiveFrom = now.
 * This preserves the full history of configuration changes for regulatory reporting.
 */
export const setConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (isBrandingConfig(args.key, args.category)) await assertPlatformOwner(ctx);
    else await assertAdminOrPlatformOwner(ctx);

    const now = Date.now();

    // Find all records for this key (may have temporal history)
    const allEntries = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .collect();

    // Find the currently effective record (no effectiveTo, or effectiveTo in future)
    const current = allEntries.find((e) => {
      if (e.deletedAt) return false;
      if (e.effectiveTo !== undefined && e.effectiveTo <= now) return false;
      return true;
    });

    if (current) {
      const oldValue = current.value;
      const oldVersion = current.version ?? 0;

      // Close the current record
      await ctx.db.patch(current._id, {
        effectiveTo: now,
        updatedAt: now,
      });

      // Insert new versioned record
      const configId = await ctx.db.insert('systemConfiguration', {
        key: args.key,
        value: args.value,
        category: args.category ?? current.category,
        description: args.description ?? current.description,
        isPublic: args.isPublic ?? current.isPublic,
        effectiveFrom: now,
        version: oldVersion + 1,
        createdAt: now,
        updatedAt: now,
      });

      scheduleAuditLog(
        ctx,
        'systemConfiguration',
        configId,
        'update_config',
        JSON.stringify(oldValue),
        JSON.stringify(args.value),
        `Updated key: ${args.key} (v${oldVersion} → v${oldVersion + 1})`
      );

      return configId;
    } else {
      // No existing record — create initial version
      const configId = await ctx.db.insert('systemConfiguration', {
        key: args.key,
        value: args.value,
        category: args.category ?? 'general',
        description: args.description,
        isPublic: args.isPublic ?? false,
        effectiveFrom: now,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      scheduleAuditLog(
        ctx,
        'systemConfiguration',
        configId,
        'create_config',
        'none',
        JSON.stringify(args.value),
        `Created key: ${args.key} (v1)`
      );

      return configId;
    }
  },
});

export const deleteConfig = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    if (isBrandingConfig(key)) await assertPlatformOwner(ctx);
    else await assertAdminOrPlatformOwner(ctx);

    const existing = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();

    if (!existing) throw new Error(`Config key not found: ${key}`);

    scheduleAuditLog(
      ctx,
      'systemConfiguration',
      existing._id,
      'delete_config',
      JSON.stringify(existing.value),
      'deleted',
      `Soft-deleted key: ${key}`
    );

    // Soft-delete: patch with deletedAt timestamp (7-year data retention rule)
    await ctx.db.patch(existing._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Bulk seed (admin only — for initial setup)
// ---------------------------------------------------------------------------

export const seedDefaultConfig = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAdminOrPlatformOwner(ctx);

    const defaults = [
      {
        key: 'apr_limit',
        value: 32,
        category: 'regulatory',
        description: 'Maximum annual percentage rate (Namibian law)',
        isPublic: true,
      },
      {
        key: 'currency_code',
        value: 'NAD',
        category: 'regulatory',
        description: 'ISO 4217 currency code',
        isPublic: true,
      },
      {
        key: 'data_retention_years',
        value: 7,
        category: 'regulatory',
        description: 'Financial record retention period (years)',
        isPublic: false,
      },
      {
        key: 'kyc_required',
        value: true,
        category: 'compliance',
        description: 'Require KYC before loan approval',
        isPublic: false,
      },
      {
        key: 'max_loan_amount',
        value: 500_000,
        category: 'credit',
        description: 'Maximum single loan amount (NAD)',
        isPublic: true,
      },
      {
        key: 'min_loan_amount',
        value: 1_000,
        category: 'credit',
        description: 'Minimum single loan amount (NAD)',
        isPublic: true,
      },
      {
        key: 'settlement_cutoff_time',
        value: '14:00',
        category: 'settlement',
        description: 'Daily IPS settlement cutoff time (UTC)',
        isPublic: false,
      },
    ];

    const now = Date.now();
    let created = 0;

    for (const config of defaults) {
      const existing = await ctx.db
        .query('systemConfiguration')
        .withIndex('by_key', (q) => q.eq('key', config.key))
        .first();

      if (!existing) {
        await ctx.db.insert('systemConfiguration', {
          ...config,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { created, skipped: defaults.length - created };
  },
});
