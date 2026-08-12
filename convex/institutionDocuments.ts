/**
 * Tenant profile and versioned regulatory-document access.
 *
 * Files remain private in Convex File Storage. The browser receives only a five-minute
 * grant URL after the exact tenant/role guard passes. Superseded versions are retained.
 */

import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import type { DataModel, Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { scheduleAuditEntry } from './lib/audit';
import { assertAuthenticated } from './lib/auth';
import { createDocumentGrant } from './lib/documentGrants';

const TENANT_STAFF_ROLES = ['admin', 'tenant_admin', 'loan_officer'];
const TENANT_ADMIN_ROLES = ['admin', 'tenant_admin'];
const MAX_INSTITUTION_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const institutionDocumentTypeValidator = v.union(
  v.literal('namfisa_registration'),
  v.literal('namra_taxpayer_certificate')
);

type DocumentType = 'namfisa_registration' | 'namra_taxpayer_certificate';

interface RecordInstitutionDocumentInput {
  documentType: DocumentType;
  issuer: string;
  documentNumber?: string;
  fileName: string;
  fileStorageId: Id<'_storage'>;
  effectiveAt?: number;
  issuedAt?: number;
  expiresAt?: number;
}

type AnyTenantInfoCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

async function resolveTenantAccess(
  ctx: AnyTenantInfoCtx,
  requestedInstitutionId: Id<'institutions'> | undefined,
  requiresManage: boolean
) {
  const actorId = await assertAuthenticated(ctx);
  const [platformAdmin, tenantRole] = await Promise.all([
    ctx.db
      .query('platformAdmins')
      .withIndex('by_userId', (q) => q.eq('userId', actorId))
      .first(),
    ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', actorId))
      .first(),
  ]);

  const isPlatformOwner =
    platformAdmin?.status === 'active' && platformAdmin.platformRole === 'platform_owner';
  if (isPlatformOwner) {
    if (!requestedInstitutionId) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Select a tenant before opening Tenant Info.',
      });
    }
    return { actorId, institutionId: requestedInstitutionId, canManage: true };
  }
  if (platformAdmin?.status === 'active' && platformAdmin.platformRole === 'platform_support') {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Platform support cannot access tenant regulatory documents.',
    });
  }

  const role = tenantRole?.role as string | undefined;
  if (!role || !TENANT_STAFF_ROLES.includes(role) || !tenantRole?.institutionId) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Tenant Info is available only to authorized tenant staff and the platform owner.',
    });
  }
  if (requestedInstitutionId && requestedInstitutionId !== tenantRole.institutionId) {
    throw new ConvexError({ code: 'FORBIDDEN', message: 'You do not have access to this tenant.' });
  }

  const canManage = TENANT_ADMIN_ROLES.includes(role);
  if (requiresManage && !canManage) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Replacing tenant documents requires tenant admin or platform owner privileges.',
    });
  }
  return { actorId, institutionId: tenantRole.institutionId, canManage };
}

function cleanText(value: string | undefined, label: string, maxLength = 180) {
  const cleaned = value?.trim();
  if (!cleaned) return undefined;
  if (cleaned.length > maxLength) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `${label} must be ${maxLength} characters or fewer.`,
    });
  }
  return cleaned;
}

function cleanPdfFileName(value: string) {
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 180 || /[\\/\0]/.test(cleaned) || !/\.pdf$/i.test(cleaned)) {
    throw new ConvexError({
      code: 'INVALID_FILE_NAME',
      message: 'Choose a PDF with a valid filename.',
    });
  }
  return cleaned;
}

function validatePdfStorage(metadata: any) {
  if (!metadata || metadata.size <= 0) {
    throw new ConvexError({ code: 'FILE_NOT_FOUND', message: 'The uploaded file is unavailable.' });
  }
  if (metadata.size > MAX_INSTITUTION_DOCUMENT_BYTES) {
    throw new ConvexError({
      code: 'FILE_TOO_LARGE',
      message: 'Tenant documents must be 10 MB or smaller.',
    });
  }
  if (metadata.contentType !== 'application/pdf') {
    throw new ConvexError({
      code: 'UNSUPPORTED_FILE_TYPE',
      message: 'Tenant documents must be uploaded as PDF files.',
    });
  }
  if (typeof metadata.sha256 !== 'string' || !metadata.sha256) {
    throw new ConvexError({
      code: 'INVALID_FILE_METADATA',
      message: 'The uploaded file checksum is unavailable.',
    });
  }
  return {
    fileSize: metadata.size as number,
    mimeType: 'application/pdf',
    sha256: metadata.sha256,
  };
}

function selectCurrent(documents: Doc<'institutionDocuments'>[]) {
  return (
    documents.find((document) => document.isCurrent && !document.supersededAt) ??
    [...documents].sort((a, b) => b.version - a.version)[0]
  );
}

async function presentDocument(ctx: AnyTenantInfoCtx, document: Doc<'institutionDocuments'>) {
  const metadata = await ctx.db.system.get('_storage', document.fileStorageId);
  return {
    id: document._id,
    institutionId: document.institutionId,
    documentType: document.documentType,
    issuer: document.issuer,
    documentNumber: document.documentNumber,
    fileName: document.fileName,
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    fileAvailable: Boolean(metadata),
    effectiveAt: document.effectiveAt,
    issuedAt: document.issuedAt,
    expiresAt: document.expiresAt,
    version: document.version,
    isCurrent: document.isCurrent && !document.supersededAt,
    uploadedAt: document.uploadedAt,
    supersededAt: document.supersededAt,
  };
}

async function recordStoredDocument(
  ctx: GenericMutationCtx<DataModel>,
  access: { actorId: Id<'users'>; institutionId: Id<'institutions'> },
  args: RecordInstitutionDocumentInput
) {
  const institution = await ctx.db.get(access.institutionId);
  if (!institution) throw new ConvexError({ code: 'NOT_FOUND', message: 'Tenant not found.' });
  if (args.effectiveAt && args.expiresAt && args.expiresAt <= args.effectiveAt) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'The expiry date must be later than the effective date.',
    });
  }

  const duplicate = await ctx.db
    .query('institutionDocuments')
    .withIndex('by_fileStorageId', (q) => q.eq('fileStorageId', args.fileStorageId))
    .first();
  if (duplicate) {
    if (
      duplicate.institutionId === access.institutionId &&
      duplicate.documentType === args.documentType
    ) {
      return duplicate._id;
    }
    throw new ConvexError({
      code: 'FILE_ALREADY_RECORDED',
      message: 'This uploaded file has already been recorded.',
    });
  }

  const stored = validatePdfStorage(await ctx.db.system.get('_storage', args.fileStorageId));
  const fileName = cleanPdfFileName(args.fileName);
  const issuer = cleanText(args.issuer, 'Issuer', 180);
  if (!issuer) {
    throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Issuer is required.' });
  }
  const documentNumber = cleanText(args.documentNumber, 'Document number', 80);
  const sameType = await ctx.db
    .query('institutionDocuments')
    .withIndex('by_institution_documentType', (q) =>
      q.eq('institutionId', access.institutionId).eq('documentType', args.documentType)
    )
    .collect();
  const previousCurrent = selectCurrent(sameType);
  const version = sameType.length
    ? Math.max(...sameType.map((document) => document.version)) + 1
    : 1;
  const now = Date.now();
  const documentId = await ctx.db.insert('institutionDocuments', {
    institutionId: access.institutionId,
    documentType: args.documentType,
    issuer,
    documentNumber,
    fileName,
    fileStorageId: args.fileStorageId,
    ...stored,
    effectiveAt: args.effectiveAt,
    issuedAt: args.issuedAt,
    expiresAt: args.expiresAt,
    version,
    isCurrent: true,
    uploadedBy: access.actorId,
    uploadedAt: now,
  });
  if (previousCurrent) {
    await ctx.db.patch(previousCurrent._id, {
      isCurrent: false,
      supersededAt: now,
      supersededBy: documentId,
    });
  }
  scheduleAuditEntry(ctx, {
    entityType: 'institutionDocuments',
    entityId: documentId,
    action: previousCurrent ? 'REPLACE' : 'UPLOAD',
    newState: {
      institutionId: access.institutionId,
      documentType: args.documentType,
      version,
    },
    userId: access.actorId,
  });
  return documentId;
}

/** Authorized tenant profile used by both admin and platform-owner screens. */
export const getTenantInfo = query({
  args: { institutionId: v.optional(v.id('institutions')) },
  handler: async (ctx, { institutionId: requestedInstitutionId }) => {
    const access = await resolveTenantAccess(ctx, requestedInstitutionId, false);
    const institution = await ctx.db.get(access.institutionId);
    if (!institution) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Tenant not found.' });
    }
    return {
      ...institution,
      canManageDocuments: access.canManage,
    };
  },
});

export const listDocuments = query({
  args: {
    institutionId: v.optional(v.id('institutions')),
    includeHistory: v.optional(v.boolean()),
  },
  handler: async (ctx, { institutionId: requestedInstitutionId, includeHistory }) => {
    const access = await resolveTenantAccess(ctx, requestedInstitutionId, false);
    const documents = await ctx.db
      .query('institutionDocuments')
      .withIndex('by_institutionId', (q) => q.eq('institutionId', access.institutionId))
      .collect();
    const visible = includeHistory
      ? documents
      : [...new Set(documents.map((document) => document.documentType))].flatMap((type) => {
          const current = selectCurrent(
            documents.filter((document) => document.documentType === type)
          );
          return current ? [current] : [];
        });
    return Promise.all(
      visible
        .sort((a, b) => b.uploadedAt - a.uploadedAt)
        .map((document) => presentDocument(ctx, document))
    );
  },
});

export const generateUploadUrl = mutation({
  args: { institutionId: v.optional(v.id('institutions')) },
  handler: async (ctx, { institutionId }) => {
    await resolveTenantAccess(ctx, institutionId, true);
    return ctx.storage.generateUploadUrl();
  },
});

export const recordDocument = mutation({
  args: {
    institutionId: v.optional(v.id('institutions')),
    documentType: institutionDocumentTypeValidator,
    issuer: v.string(),
    documentNumber: v.optional(v.string()),
    fileName: v.string(),
    fileStorageId: v.id('_storage'),
    effectiveAt: v.optional(v.number()),
    issuedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = await resolveTenantAccess(ctx, args.institutionId, true);
    return recordStoredDocument(ctx, access, args);
  },
});

export const requestDocumentAccess = mutation({
  args: {
    documentId: v.id('institutionDocuments'),
    intent: v.union(v.literal('preview'), v.literal('download')),
  },
  handler: async (ctx, { documentId, intent }) => {
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Tenant document not found.' });
    }
    const access = await resolveTenantAccess(ctx, document.institutionId, false);
    const metadata = await ctx.db.system.get('_storage', document.fileStorageId);
    const url = metadata
      ? await createDocumentGrant(ctx, {
          storageId: document.fileStorageId,
          sourceTable: 'institutionDocuments',
          documentId,
          actorId: access.actorId,
          intent,
          fileName: document.fileName,
          mimeType: document.mimeType,
        })
      : null;
    scheduleAuditEntry(ctx, {
      entityType: 'institutionDocuments',
      entityId: documentId,
      action: intent === 'preview' ? 'PREVIEW' : 'DOWNLOAD',
      newState: { documentType: document.documentType, available: Boolean(url) },
      userId: access.actorId,
    });
    return {
      url,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
    };
  },
});
