import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import type { DataModel, Doc, Id } from '../_generated/dataModel';
import {
  KYC_DOCUMENT_TYPES,
  REQUIRED_KYC_DOCUMENT_TYPES,
  type KycDocumentType,
} from './documentPolicy';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

function newestFirst(a: Doc<'kycDocuments'>, b: Doc<'kycDocuments'>): number {
  return (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime);
}

/**
 * Resolve one current version per known document type. Explicit version markers win;
 * legacy rows fall back to the newest non-superseded row, then the newest row overall.
 */
export function selectCurrentKycDocuments(documents: Doc<'kycDocuments'>[]): Doc<'kycDocuments'>[] {
  const current: Doc<'kycDocuments'>[] = [];
  for (const documentType of KYC_DOCUMENT_TYPES) {
    const candidates = documents
      .filter((doc) => doc.documentType === documentType)
      .sort(newestFirst);
    if (candidates.length === 0) continue;
    current.push(
      candidates.find((doc) => doc.isCurrent === true) ??
        candidates.find((doc) => doc.isCurrent !== false && !doc.supersededAt) ??
        candidates[0]
    );
  }
  return current;
}

export async function getKycReadiness(ctx: AnyCtx, userId: Id<'users'>) {
  const [profile, documents] = await Promise.all([
    ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first(),
    ctx.db
      .query('kycDocuments')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect(),
  ]);

  const currentDocuments = selectCurrentKycDocuments(documents);
  const byType = new Map(currentDocuments.map((doc) => [doc.documentType, doc]));
  const availableCurrentDocumentIds = new Set(
    (
      await Promise.all(
        currentDocuments.map(async (document) => ({
          id: document._id,
          metadata: document.fileStorageId
            ? await ctx.db.system.get('_storage', document.fileStorageId)
            : null,
        }))
      )
    )
      .filter(({ metadata }) => Boolean(metadata))
      .map(({ id }) => id)
  );
  const missingRequiredDocumentTypes = REQUIRED_KYC_DOCUMENT_TYPES.filter((type) => {
    const document = byType.get(type);
    return !document || !availableCurrentDocumentIds.has(document._id);
  });
  const approvedRequiredDocumentTypes = REQUIRED_KYC_DOCUMENT_TYPES.filter(
    (type) => byType.get(type)?.status === 'approved'
  );
  const rejectedRequiredDocumentTypes = REQUIRED_KYC_DOCUMENT_TYPES.filter(
    (type) => byType.get(type)?.status === 'rejected'
  );
  const submittedDocuments = currentDocuments.filter((doc) => doc.submittedAt !== undefined);

  return {
    profile,
    documents,
    currentDocuments,
    status: profile?.kycStatus ?? ('pending' as const),
    eligible: profile?.kycStatus === 'verified',
    canSubmit:
      profile?.kycStatus === 'pending' &&
      missingRequiredDocumentTypes.length === 0 &&
      rejectedRequiredDocumentTypes.length === 0,
    missingRequiredDocumentTypes,
    approvedRequiredDocumentTypes,
    rejectedRequiredDocumentTypes,
    submittedDocuments,
    allSubmittedDocumentsDecided:
      submittedDocuments.length > 0 && submittedDocuments.every((doc) => doc.status !== 'pending'),
    requiredDocumentTypes: [...REQUIRED_KYC_DOCUMENT_TYPES] as KycDocumentType[],
  };
}
