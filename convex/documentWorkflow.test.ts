import { convexTest } from 'convex-test';
import { describe, expect, test, vi } from 'vitest';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  MAX_DOCUMENT_BYTES,
  validateOriginalFileName,
  validateStoredDocument,
} from './lib/documentPolicy';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');
type TestCtx = ReturnType<typeof convexTest>;
type Role = 'client' | 'loan_officer' | 'admin' | 'tenant_admin';

// `requestDocumentAccess` mints grant URLs anchored to the deployment's site URL,
// which convex-test does not provide.
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

async function seedUser(
  t: TestCtx,
  role: Role,
  institutionId: Id<'institutions'>,
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected' = 'pending'
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      institutionId,
      email: `${userId}@example.test`,
      // submitMyKyc asserts both server-side; seeded users represent completed profiles.
      phone: '+264811234567',
      idNumber: '90010100123',
      kycStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('userRoles', {
      userId,
      role,
      institutionId,
      createdAt: Date.now(),
    });
    return userId;
  });
}

async function storeFile(
  t: TestCtx,
  contentType = 'application/pdf',
  contents = 'document contents'
): Promise<Id<'_storage'>> {
  return t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob([contents], { type: contentType }));
    // convex-test currently omits Blob.type from its in-memory _storage row.
    await (ctx.db.patch as (id: Id<'_storage'>, value: { contentType: string }) => Promise<void>)(
      storageId,
      { contentType }
    );
    return storageId;
  });
}

describe('authoritative document validation', () => {
  test('accepts only supported non-empty stored files up to 5 MB', () => {
    expect(
      validateStoredDocument({
        size: 512,
        sha256: 'checksum',
        contentType: 'application/pdf',
      })
    ).toMatchObject({ fileSize: 512, mimeType: 'application/pdf', sha256: 'checksum' });

    expect(() =>
      validateStoredDocument({
        size: MAX_DOCUMENT_BYTES + 1,
        sha256: 'checksum',
        contentType: 'application/pdf',
      })
    ).toThrow();
    expect(() =>
      validateStoredDocument({ size: 512, sha256: 'checksum', contentType: 'text/plain' })
    ).toThrow();
    expect(() => validateStoredDocument(null)).toThrow();
  });

  test('rejects unsafe or empty original filenames', () => {
    expect(validateOriginalFileName('  payslip.pdf  ')).toBe('payslip.pdf');
    expect(() => validateOriginalFileName('../identity.pdf')).toThrow();
    expect(() => validateOriginalFileName('')).toThrow();
  });
});

describe('KYC package lifecycle', () => {
  test('persists metadata, submits idempotently, supports optional rejection and retains versions', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const institution = await seedInstitution(t, 'KYC-A');
      const otherInstitution = await seedInstitution(t, 'KYC-B');
      const client = await seedUser(t, 'client', institution);
      const unrelatedClient = await seedUser(t, 'client', institution);
      const reviewer = await seedUser(t, 'loan_officer', institution);
      const crossTenantReviewer = await seedUser(t, 'admin', otherInstitution);
      const clientApi = asUser(t, client);
      const reviewerApi = asUser(t, reviewer);

      const idFile = await storeFile(t, 'image/jpeg', 'identity');
      const incomeFile = await storeFile(t, 'application/pdf', 'income');
      const optionalFile = await storeFile(t, 'image/png', 'bank');
      await clientApi.mutation(api.kycDocuments.recordDocument, {
        documentType: 'id_card',
        fileStorageId: idFile,
        fileName: 'national-id.jpg',
      });
      await clientApi.mutation(api.kycDocuments.recordDocument, {
        documentType: 'proof_income',
        fileStorageId: incomeFile,
        fileName: 'payslip.pdf',
      });
      await clientApi.mutation(api.kycDocuments.recordDocument, {
        documentType: 'bank_statement',
        fileStorageId: optionalFile,
        fileName: 'statement.png',
      });

      const persisted = await clientApi.query(api.kycDocuments.getMyKycOverview, {});
      expect(persisted.requiredDocumentTypes).toEqual(['id_card', 'proof_income']);
      expect(persisted.optionalDocumentTypes).toEqual(['bank_statement', 'employment_letter']);
      expect(persisted.canSubmit).toBe(true);
      expect(
        persisted.documents.find((document) => document.documentType === 'proof_income')
      ).toMatchObject({
        fileName: 'payslip.pdf',
        mimeType: 'application/pdf',
        fileAvailable: true,
        version: 1,
      });

      const ownerAccess = await clientApi.mutation(api.kycDocuments.requestDocumentAccess, {
        documentId: persisted.documents[0].id,
        intent: 'preview',
      });
      expect(ownerAccess.url).toContain('http');
      await expect(
        asUser(t, unrelatedClient).mutation(api.kycDocuments.requestDocumentAccess, {
          documentId: persisted.documents[0].id,
          intent: 'preview',
        })
      ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
      await expect(
        asUser(t, crossTenantReviewer).mutation(api.kycDocuments.requestDocumentAccess, {
          documentId: persisted.documents[0].id,
          intent: 'download',
        })
      ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
      expect(
        (
          await reviewerApi.mutation(api.kycDocuments.requestDocumentAccess, {
            documentId: persisted.documents[0].id,
            intent: 'download',
          })
        ).url
      ).toContain('http');

      const firstRequest = await clientApi.mutation(api.kycDocuments.submitMyKyc, {});
      expect(await clientApi.mutation(api.kycDocuments.submitMyKyc, {})).toBe(firstRequest);
      await expect(
        reviewerApi.mutation(api.approvalWorkflow.processApprovalRequest, {
          requestId: firstRequest,
          action: 'approve',
        })
      ).rejects.toMatchObject({ data: { code: 'DEDICATED_KYC_REVIEW_REQUIRED' } });
      expect(
        await t.run(
          async (ctx) =>
            (
              await ctx.db
                .query('approvalRequests')
                .withIndex('by_requestedBy', (q) => q.eq('requestedBy', client))
                .collect()
            ).filter((request) => request.entityType === 'kyc').length
        )
      ).toBe(1);

      const submitted = await clientApi.query(api.kycDocuments.getMyKycOverview, {});
      const byType = new Map(
        submitted.documents.map((document) => [document.documentType, document])
      );
      await reviewerApi.mutation(api.kycDocuments.reviewDocument, {
        documentId: byType.get('id_card')!.id,
        decision: 'approved',
      });
      await reviewerApi.mutation(api.kycDocuments.reviewDocument, {
        documentId: byType.get('proof_income')!.id,
        decision: 'approved',
      });
      await expect(
        reviewerApi.mutation(api.kycDocuments.reviewDocument, {
          documentId: byType.get('bank_statement')!.id,
          decision: 'rejected',
        })
      ).rejects.toMatchObject({ data: { code: 'REJECTION_REASON_REQUIRED' } });
      await reviewerApi.mutation(api.kycDocuments.reviewDocument, {
        documentId: byType.get('bank_statement')!.id,
        decision: 'rejected',
        notes: 'Statement is not readable.',
      });
      expect(
        (await reviewerApi.query(api.kycDocuments.getUserKycOverview, { userId: client }))
          .allSubmittedDocumentsDecided
      ).toBe(true);
      expect(
        await reviewerApi.mutation(api.kycDocuments.completeReview, { requestId: firstRequest })
      ).toEqual({ status: 'verified' });

      const replacementFile = await storeFile(t, 'application/pdf', 'replacement income');
      await clientApi.mutation(api.kycDocuments.recordDocument, {
        documentType: 'proof_income',
        fileStorageId: replacementFile,
        fileName: 'new-payslip.pdf',
      });
      const reopened = await clientApi.query(api.kycDocuments.getMyKycOverview, {});
      expect(reopened.status).toBe('pending');
      expect(reopened.eligible).toBe(false);
      expect(reopened.isResubmission).toBe(true);
      expect(
        reopened.documents.find((document) => document.documentType === 'proof_income')
      ).toMatchObject({
        fileName: 'new-payslip.pdf',
        version: 2,
        status: 'pending',
      });
      expect(reopened.history.some((document) => document.fileName === 'payslip.pdf')).toBe(true);

      const secondRequest = await clientApi.mutation(api.kycDocuments.submitMyKyc, {});
      expect(secondRequest).not.toBe(firstRequest);
      const replacement = (
        await clientApi.query(api.kycDocuments.getMyKycOverview, {})
      ).documents.find((document) => document.documentType === 'proof_income')!;
      await reviewerApi.mutation(api.kycDocuments.reviewDocument, {
        documentId: replacement.id,
        decision: 'rejected',
        notes: 'Employer details are missing.',
      });
      expect(
        await reviewerApi.mutation(api.kycDocuments.completeReview, { requestId: secondRequest })
      ).toEqual({ status: 'rejected' });

      await t.finishAllScheduledFunctions(() => vi.runAllTimers());
      const complianceRecords = await t.run(async (ctx) => ({
        notifications: await ctx.db
          .query('notifications')
          .withIndex('by_userId', (q) => q.eq('userId', client))
          .collect(),
        audits: await ctx.db.query('auditLogs').collect(),
      }));
      expect(
        complianceRecords.notifications.some((item) => item.title.includes('resubmitted'))
      ).toBe(true);
      expect(
        complianceRecords.notifications.some((item) => item.title.includes('need attention'))
      ).toBe(true);
      expect(complianceRecords.audits.some((item) => item.action === 'COMPLETE_KYC_REVIEW')).toBe(
        true
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('loan document workflow', () => {
  test('enforces loan state and tenant access while retaining replacement history', async () => {
    const t = convexTest(schema, modules);
    const institution = await seedInstitution(t, 'LOAN-A');
    const otherInstitution = await seedInstitution(t, 'LOAN-B');
    const client = await seedUser(t, 'client', institution, 'verified');
    const unrelatedClient = await seedUser(t, 'client', institution);
    const reviewer = await seedUser(t, 'tenant_admin', institution);
    const crossTenantReviewer = await seedUser(t, 'loan_officer', otherInstitution);
    const loanId = await t.run((ctx) =>
      ctx.db.insert('loans', {
        userId: client,
        institutionId: institution,
        principal: 10_000,
        interestRate: 20,
        termMonths: 12,
        status: 'under_review',
        outstandingBalance: 10_000,
        totalPaid: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    const clientApi = asUser(t, client);
    const reviewerApi = asUser(t, reviewer);
    const firstFile = await storeFile(t, 'application/pdf', 'first statement');
    const firstDocument = await clientApi.mutation(api.loanDocuments.recordDocument, {
      loanId,
      documentType: 'bank_statement',
      fileName: 'loan-statement.pdf',
      fileStorageId: firstFile,
    });
    expect(await clientApi.query(api.loanDocuments.getLoanDocuments, { loanId })).toMatchObject([
      {
        id: firstDocument,
        fileName: 'loan-statement.pdf',
        mimeType: 'application/pdf',
        status: 'pending',
        version: 1,
      },
    ]);

    await expect(
      asUser(t, unrelatedClient).mutation(api.loanDocuments.requestDocumentAccess, {
        documentId: firstDocument,
        intent: 'preview',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, crossTenantReviewer).query(api.loanDocuments.getLoanDocuments, { loanId })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    expect(
      (
        await reviewerApi.mutation(api.loanDocuments.requestDocumentAccess, {
          documentId: firstDocument,
          intent: 'download',
        })
      ).url
    ).toContain('http');

    await expect(
      reviewerApi.mutation(api.loanDocuments.reviewDocument, {
        documentId: firstDocument,
        decision: 'rejected',
      })
    ).rejects.toMatchObject({ data: { code: 'REJECTION_REASON_REQUIRED' } });
    await reviewerApi.mutation(api.loanDocuments.reviewDocument, {
      documentId: firstDocument,
      decision: 'rejected',
      notes: 'The transaction period is incomplete.',
    });

    const replacementFile = await storeFile(t, 'image/png', 'new statement');
    const replacement = await clientApi.mutation(api.loanDocuments.recordDocument, {
      loanId,
      documentType: 'bank_statement',
      fileName: 'new-statement.png',
      fileStorageId: replacementFile,
    });
    const allVersions = await clientApi.query(api.loanDocuments.getLoanDocuments, {
      loanId,
      includeHistory: true,
    });
    expect(allVersions).toHaveLength(2);
    expect(allVersions.find((document) => document.id === replacement)).toMatchObject({
      version: 2,
      isCurrent: true,
      status: 'pending',
    });
    expect(allVersions.find((document) => document.id === firstDocument)).toMatchObject({
      version: 1,
      isCurrent: false,
      status: 'rejected',
    });

    await t.run((ctx) => ctx.db.patch(loanId, { status: 'approved', updatedAt: Date.now() }));
    const lateFile = await storeFile(t, 'application/pdf', 'too late');
    await expect(
      clientApi.mutation(api.loanDocuments.recordDocument, {
        loanId,
        documentType: 'proof_income',
        fileName: 'late.pdf',
        fileStorageId: lateFile,
      })
    ).rejects.toMatchObject({ data: { code: 'DOCUMENTS_READ_ONLY' } });
  });
});

describe('legacy document backfill', () => {
  test('reports first, then restores metadata and ordered current-version markers without deletion', async () => {
    const t = convexTest(schema, modules);
    const institution = await seedInstitution(t, 'BACKFILL');
    const client = await seedUser(t, 'client', institution);
    const olderFile = await storeFile(t, 'application/pdf', 'older');
    const newerFile = await storeFile(t, 'application/pdf', 'newer');
    const ids = await t.run(async (ctx) => {
      const older = await ctx.db.insert('kycDocuments', {
        userId: client,
        institutionId: institution,
        documentType: 'proof_income',
        fileStorageId: olderFile,
        status: 'pending',
        createdAt: 1,
        updatedAt: 1,
      });
      const newer = await ctx.db.insert('kycDocuments', {
        userId: client,
        institutionId: institution,
        documentType: 'proof_income',
        fileStorageId: newerFile,
        status: 'pending',
        createdAt: 2,
        updatedAt: 2,
      });
      return { older, newer };
    });

    const report = await t.mutation(internal.kycDocuments.backfillLegacyDocumentMetadata, {
      dryRun: true,
      limit: 100,
    });
    expect(report).toMatchObject({
      scanned: 2,
      metadataRecovered: 2,
      unavailable: 0,
      versionMarkersAdded: 2,
      dryRun: true,
      isDone: true,
    });
    const unchanged = await t.run((ctx) => ctx.db.get(ids.older));
    expect(unchanged?.version).toBeUndefined();
    expect(unchanged?.isCurrent).toBeUndefined();

    await t.mutation(internal.kycDocuments.backfillLegacyDocumentMetadata, {
      dryRun: false,
      limit: 100,
    });
    expect(await t.run((ctx) => ctx.db.get(ids.older))).toMatchObject({
      version: 1,
      isCurrent: false,
      mimeType: 'application/pdf',
    });
    expect(await t.run((ctx) => ctx.db.get(ids.newer))).toMatchObject({
      version: 2,
      isCurrent: true,
      mimeType: 'application/pdf',
    });
    expect(await t.run((ctx) => ctx.db.query('kycDocuments').collect())).toHaveLength(2);
  });
});

describe('KYC queue tenant visibility (Phase-0 tolerance)', () => {
  /** The bucket the main suite misses: its seeds always stamp institutionId. */
  async function seedUnboundStaff(t: TestCtx): Promise<Id<'users'>> {
    return t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {});
      await ctx.db.insert('profiles', {
        userId,
        email: `${userId}@example.test`,
        kycStatus: 'verified',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      // Exactly what seedMutations.createTestUser produces: no institutionId.
      await ctx.db.insert('userRoles', { userId, role: 'admin', createdAt: Date.now() });
      return userId;
    });
  }

  async function seedKycRequest(
    t: TestCtx,
    requestedBy: Id<'users'>,
    institutionId?: Id<'institutions'>
  ) {
    return t.run((ctx) =>
      ctx.db.insert('approvalRequests', {
        entityType: 'kyc',
        entityId: 'profile-1',
        requestType: 'kyc_review',
        status: 'pending',
        requestedBy,
        institutionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
  }

  test('unbound staff see unstamped KYC requests (fresh-deployment shape)', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUnboundStaff(t);
    const client = await t.run((ctx) => ctx.db.insert('users', {}));
    await seedKycRequest(t, client); // no institutionId anywhere

    const rows = await asUser(t, staff).query(api.approvalWorkflow.adminListApprovals, {});
    expect(rows.filter((r) => r.entityType === 'kyc')).toHaveLength(1);
  });

  test('bound staff still see unstamped KYC requests, but never another tenant’s', async () => {
    const t = convexTest(schema, modules);
    const tenantA = await seedInstitution(t, 'TENA');
    const tenantB = await seedInstitution(t, 'TENB');
    const staffA = await seedUser(t, 'admin', tenantA);
    const client = await t.run((ctx) => ctx.db.insert('users', {}));

    await seedKycRequest(t, client); // unstamped → visible (Phase-0)
    await seedKycRequest(t, client, tenantA); // own tenant → visible
    await seedKycRequest(t, client, tenantB); // other tenant → hidden

    const rows = await asUser(t, staffA).query(api.approvalWorkflow.adminListApprovals, {});
    const kyc = rows.filter((r) => r.entityType === 'kyc');
    expect(kyc).toHaveLength(2);
    expect(kyc.some((r) => r.institutionId === tenantB)).toBe(false);
  });
});

describe('server-authoritative profile completion', () => {
  test('submitMyKyc rejects a profile without phone or ID — the UI gate is UX only', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INCP');
    // A Google sign-up that bypassed the browser gate: profile exists, no phone/ID.
    const userId = await t.run(async (ctx) => {
      const id = await ctx.db.insert('users', {});
      await ctx.db.insert('profiles', {
        userId: id,
        institutionId: inst,
        email: 'gate@example.test',
        signupSource: 'google',
        kycStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert('userRoles', { userId: id, role: 'client', createdAt: Date.now() });
      return id;
    });

    await expect(asUser(t, userId).mutation(api.kycDocuments.submitMyKyc, {})).rejects.toThrowError(
      /PROFILE_INCOMPLETE|phone number and ID/
    );
  });
});

describe('document access grants', () => {
  async function seedKycDocWithFile(t: TestCtx, institutionId: Id<'institutions'>) {
    const owner = await seedUser(t, 'client', institutionId);
    const storageId = await storeFile(t);
    const documentId = await t.run((ctx) =>
      ctx.db.insert('kycDocuments', {
        userId: owner,
        institutionId,
        documentType: 'national_id',
        fileName: 'id-scan.pdf',
        fileStorageId: storageId,
        mimeType: 'application/pdf',
        version: 1,
        isCurrent: true,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    return { owner, documentId, storageId };
  }

  test('mints a short-lived fetch URL instead of a permanent storage URL', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'GRNT');
    const { owner, documentId } = await seedKycDocWithFile(t, inst);

    const access = await asUser(t, owner).mutation(api.kycDocuments.requestDocumentAccess, {
      documentId,
      intent: 'preview',
    });

    expect(access.url).toMatch(
      /^https:\/\/test\.convex\.site\/documents\/fetch\?grant=[0-9a-f]{64}$/
    );
    // The permanent unauthenticated storage URL must never be surfaced.
    expect(access.url).not.toContain('/api/storage/');

    const grants = await t.run((ctx) => ctx.db.query('documentAccessGrants').collect());
    expect(grants).toHaveLength(1);
    expect(grants[0].actorId).toBe(owner);
    expect(grants[0].expiresAt).toBeGreaterThan(Date.now());
  });

  test('consumeGrant validates, records the fetch, and rejects expiry/unknown', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'GRN2');
    const { owner, documentId, storageId } = await seedKycDocWithFile(t, inst);

    const access = await asUser(t, owner).mutation(api.kycDocuments.requestDocumentAccess, {
      documentId,
      intent: 'download',
    });
    const nonce = new URL(access.url as string).searchParams.get('grant') as string;

    // Valid: returns streaming metadata and counts the fetch.
    const first = await t.mutation(internal.documentAccess.consumeGrant, { nonce });
    expect(first).toMatchObject({ storageId, fileName: 'id-scan.pdf', intent: 'download' });
    const [grant] = await t.run((ctx) => ctx.db.query('documentAccessGrants').collect());
    expect(grant.fetchCount).toBe(1);

    // Unknown nonce: null, indistinguishable from expired.
    expect(
      await t.mutation(internal.documentAccess.consumeGrant, { nonce: 'f'.repeat(64) })
    ).toBeNull();

    // Expired: null, and the row is retained (access history, no hard deletes).
    await t.run((ctx) => ctx.db.patch(grant._id, { expiresAt: Date.now() - 1 }));
    expect(await t.mutation(internal.documentAccess.consumeGrant, { nonce })).toBeNull();
    expect(await t.run((ctx) => ctx.db.query('documentAccessGrants').collect())).toHaveLength(1);
  });
});
