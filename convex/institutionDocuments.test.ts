import { convexTest } from 'convex-test';
import { describe, expect, test, vi } from 'vitest';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { GRANT_TTL_MS } from './lib/documentGrants';

const modules = import.meta.glob('./**/*.*s');
type TestCtx = ReturnType<typeof convexTest>;
type TenantRole = 'client' | 'loan_officer' | 'admin' | 'tenant_admin';

vi.stubEnv('CONVEX_SITE_URL', 'https://test.convex.site');

function asUser(t: TestCtx, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedInstitution(t: TestCtx, code: string): Promise<Id<'institutions'>> {
  return t.run((ctx) =>
    ctx.db.insert('institutions', {
      name: code,
      shortCode: code,
      type: 'lender',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
}

async function seedTenantUser(
  t: TestCtx,
  role: TenantRole,
  institutionId: Id<'institutions'>
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('userRoles', { userId, role, institutionId, createdAt: Date.now() });
    return userId;
  });
}

async function seedPlatformUser(
  t: TestCtx,
  platformRole: 'platform_owner' | 'platform_support'
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('platformAdmins', {
      userId,
      platformRole,
      status: 'active',
      createdAt: Date.now(),
    });
    return userId;
  });
}

/** Tenant admin who is also an active platform_owner — the aromatic dual-hat shape. */
async function seedDualHatAdmin(
  t: TestCtx,
  institutionId: Id<'institutions'>
): Promise<Id<'users'>> {
  const userId = await seedTenantUser(t, 'admin', institutionId);
  await t.run(async (ctx) => {
    await ctx.db.insert('platformAdmins', {
      userId,
      platformRole: 'platform_owner',
      status: 'active',
      createdAt: Date.now(),
    });
  });
  return userId;
}

async function storePdf(t: TestCtx, contents: string): Promise<Id<'_storage'>> {
  return t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob([contents], { type: 'application/pdf' }));
    await (ctx.db.patch as (id: Id<'_storage'>, value: { contentType: string }) => Promise<void>)(
      storageId,
      { contentType: 'application/pdf' }
    );
    return storageId;
  });
}

async function storeFile(
  t: TestCtx,
  contents: BlobPart,
  contentType: string
): Promise<Id<'_storage'>> {
  return t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob([contents], { type: contentType }));
    await (ctx.db.patch as (id: Id<'_storage'>, value: { contentType: string }) => Promise<void>)(
      storageId,
      { contentType }
    );
    return storageId;
  });
}

describe('institution document security and retention', () => {
  test('enforces the role matrix and retains every superseded version', async () => {
    const t = convexTest(schema, modules);
    const institution = await seedInstitution(t, 'OGFS');
    const otherInstitution = await seedInstitution(t, 'OTHER');
    const admin = await seedTenantUser(t, 'tenant_admin', institution);
    const loanOfficer = await seedTenantUser(t, 'loan_officer', institution);
    const crossTenantAdmin = await seedTenantUser(t, 'admin', otherInstitution);
    const client = await seedTenantUser(t, 'client', institution);
    const owner = await seedPlatformUser(t, 'platform_owner');
    const support = await seedPlatformUser(t, 'platform_support');

    const adminApi = asUser(t, admin);
    const firstFile = await storePdf(t, 'namfisa version one');
    const firstDocument = await adminApi.mutation(api.institutionDocuments.recordDocument, {
      documentType: 'namfisa_registration',
      issuer: 'NAMFISA',
      documentNumber: '25/11/2366',
      fileName: 'namfisa-registration.pdf',
      fileStorageId: firstFile,
      effectiveAt: Date.UTC(2026, 3, 20),
      expiresAt: Date.UTC(2027, 3, 19),
    });

    expect(
      await asUser(t, loanOfficer).query(api.institutionDocuments.listDocuments, {})
    ).toMatchObject([{ id: firstDocument, version: 1, isCurrent: true }]);
    await expect(
      asUser(t, loanOfficer).mutation(api.institutionDocuments.generateUploadUrl, {})
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, client).query(api.institutionDocuments.getTenantInfo, {})
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, crossTenantAdmin).query(api.institutionDocuments.listDocuments, {
        institutionId: institution,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, support).query(api.institutionDocuments.getTenantInfo, {
        institutionId: institution,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    expect(
      await asUser(t, owner).query(api.institutionDocuments.getTenantInfo, {
        institutionId: institution,
      })
    ).toMatchObject({ _id: institution, canManageDocuments: true });
    await expect(
      asUser(t, owner).query(api.institutionDocuments.getTenantInfo, {})
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });

    const secondFile = await storePdf(t, 'namfisa version two');
    const secondDocument = await adminApi.mutation(api.institutionDocuments.recordDocument, {
      documentType: 'namfisa_registration',
      issuer: 'NAMFISA',
      documentNumber: '25/11/2366',
      fileName: 'namfisa-registration-renewed.pdf',
      fileStorageId: secondFile,
      effectiveAt: Date.UTC(2027, 3, 20),
      expiresAt: Date.UTC(2028, 3, 19),
    });
    const versions = await adminApi.query(api.institutionDocuments.listDocuments, {
      includeHistory: true,
    });
    expect(versions).toHaveLength(2);
    expect(versions.find((document) => document.id === firstDocument)).toMatchObject({
      version: 1,
      isCurrent: false,
    });
    expect(versions.find((document) => document.id === secondDocument)).toMatchObject({
      version: 2,
      isCurrent: true,
    });
    expect(await t.run((ctx) => ctx.db.query('institutionDocuments').collect())).toHaveLength(2);
  });

  test('mints single-use audited access grants for same-tenant staff', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const institution = await seedInstitution(t, 'OGFS');
      const admin = await seedTenantUser(t, 'admin', institution);
      const loanOfficer = await seedTenantUser(t, 'loan_officer', institution);
      const fileStorageId = await storePdf(t, 'tax certificate');
      const documentId = await asUser(t, admin).mutation(api.institutionDocuments.recordDocument, {
        documentType: 'namra_taxpayer_certificate',
        issuer: 'NamRA',
        documentNumber: '15848714',
        fileName: 'namra-certificate.pdf',
        fileStorageId,
        effectiveAt: Date.UTC(2025, 10, 6),
        issuedAt: Date.UTC(2025, 11, 17),
      });
      const access = await asUser(t, loanOfficer).mutation(
        api.institutionDocuments.requestDocumentAccess,
        { documentId, intent: 'preview' }
      );
      expect(access.url).toContain('/documents/fetch?grant=');
      const nonce = new URL(access.url!).searchParams.get('grant')!;
      expect(await t.mutation(internal.documentAccess.consumeGrant, { nonce })).toMatchObject({
        storageId: fileStorageId,
        intent: 'preview',
      });
      expect(await t.mutation(internal.documentAccess.consumeGrant, { nonce })).toBeNull();

      const expiringAccess = await asUser(t, loanOfficer).mutation(
        api.institutionDocuments.requestDocumentAccess,
        { documentId, intent: 'download' }
      );
      const expiringNonce = new URL(expiringAccess.url!).searchParams.get('grant')!;
      vi.advanceTimersByTime(GRANT_TTL_MS + 1);
      expect(
        await t.mutation(internal.documentAccess.consumeGrant, { nonce: expiringNonce })
      ).toBeNull();

      await t.finishAllScheduledFunctions(() => vi.runAllTimers());
      const evidence = await t.run(async (ctx) => ({
        grants: await ctx.db.query('documentAccessGrants').collect(),
        audits: await ctx.db.query('auditLogs').collect(),
      }));
      expect(evidence.grants).toHaveLength(2);
      expect(evidence.grants.find((grant) => grant.intent === 'preview')).toMatchObject({
        sourceTable: 'institutionDocuments',
        fetchCount: 1,
        actorId: loanOfficer,
      });
      expect(evidence.grants.find((grant) => grant.intent === 'download')).toMatchObject({
        sourceTable: 'institutionDocuments',
        fetchCount: 0,
        actorId: loanOfficer,
      });
      expect(
        evidence.audits.some(
          (entry) => entry.entityType === 'institutionDocuments' && entry.action === 'FETCH'
        )
      ).toBe(true);
      expect(
        evidence.audits.some(
          (entry) => entry.entityType === 'institutionDocuments' && entry.action === 'GRANT_CREATE'
        )
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test('rejects non-PDF and oversized uploads before a document row is created', async () => {
    const t = convexTest(schema, modules);
    const institution = await seedInstitution(t, 'OGFS');
    const admin = await seedTenantUser(t, 'admin', institution);
    const adminApi = asUser(t, admin);
    const textFile = await storeFile(t, 'not a pdf', 'text/plain');

    await expect(
      adminApi.mutation(api.institutionDocuments.recordDocument, {
        documentType: 'namra_taxpayer_certificate',
        issuer: 'NamRA',
        fileName: 'invalid.pdf',
        fileStorageId: textFile,
      })
    ).rejects.toMatchObject({ data: { code: 'UNSUPPORTED_FILE_TYPE' } });

    const oversizedPdf = await storeFile(
      t,
      new Uint8Array(10 * 1024 * 1024 + 1),
      'application/pdf'
    );
    await expect(
      adminApi.mutation(api.institutionDocuments.recordDocument, {
        documentType: 'namfisa_registration',
        issuer: 'NAMFISA',
        fileName: 'oversized.pdf',
        fileStorageId: oversizedPdf,
      })
    ).rejects.toMatchObject({ data: { code: 'FILE_TOO_LARGE' } });

    expect(await t.run((ctx) => ctx.db.query('institutionDocuments').collect())).toHaveLength(0);
  });

  test('dual-hat platform owner uses bound tenant when no institutionId is selected', async () => {
    const t = convexTest(schema, modules);
    const institution = await seedInstitution(t, 'OGFS');
    const otherInstitution = await seedInstitution(t, 'OTHER');
    const dualHat = await seedDualHatAdmin(t, institution);
    const dualHatApi = asUser(t, dualHat);

    expect(await dualHatApi.query(api.institutionDocuments.getTenantInfo, {})).toMatchObject({
      _id: institution,
      canManageDocuments: true,
    });
    expect(await dualHatApi.query(api.institutionDocuments.listDocuments, {})).toEqual([]);
    expect(
      await dualHatApi.query(api.institutionDocuments.getTenantInfo, {
        institutionId: otherInstitution,
      })
    ).toMatchObject({ _id: otherInstitution, canManageDocuments: true });
  });
});

describe('OG Financial Services tenant migration', () => {
  test('renames the legacy tenant in place and remains idempotent', async () => {
    const t = convexTest(schema, modules);
    const legacyInstitution = await t.run((ctx) =>
      ctx.db.insert('institutions', {
        name: 'NamLend Trust',
        shortCode: 'NAMLEND',
        type: 'lender',
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
      })
    );

    const first = await t.mutation(internal.platform.seed.migrateOgFinancialServices, {});
    const second = await t.mutation(internal.platform.seed.migrateOgFinancialServices, {});
    expect(first.institutionId).toBe(legacyInstitution);
    expect(second.institutionId).toBe(legacyInstitution);

    const migrated = await t.run((ctx) => ctx.db.get(legacyInstitution));
    expect(migrated).toMatchObject({
      name: 'OG Financial Services',
      legalName: 'OG Financial Services CC',
      shortCode: 'OGFS',
      registrationNumber: 'CC/2025/12791',
      regulatoryLicense: '25/11/2366',
      taxIdentificationNumber: '15848714',
    });
    const configs = await t.run((ctx) => ctx.db.query('systemConfiguration').collect());
    expect(configs.filter((item) => item.effectiveTo === undefined)).toHaveLength(4);
    expect(configs.filter((item) => item.key === 'branding.general')).toHaveLength(1);
    expect(await t.run((ctx) => ctx.db.query('institutions').collect())).toHaveLength(1);
  });
});
