import {
  LIVE_IPP_IMPLEMENTATION,
  QUARANTINED_IPP_SURFACES,
  SUPPORTED_IPP_FLOWS,
} from '@/constants/ippSupportMatrix';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(__dirname, '../..');
const integrationDoc = fs.readFileSync(path.join(rootDir, 'docs/IPP_INTEGRATION.md'), 'utf8');
const gapAssessmentDoc = fs.readFileSync(
  path.join(rootDir, 'docs/IPP/IPP_GAP_ASSESSMENT.md'),
  'utf8'
);
const normalizeDoc = (value: string) => value.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();

describe('IPP support matrix drift checks', () => {
  it('documents Convex as the live IPP implementation and Supabase as legacy', () => {
    const normalizedIntegrationDoc = normalizeDoc(integrationDoc);
    const normalizedGapAssessmentDoc = normalizeDoc(gapAssessmentDoc);

    expect(LIVE_IPP_IMPLEMENTATION).toBe('Convex');
    expect(normalizedIntegrationDoc).toContain('Authoritative Implementation: Convex');
    expect(normalizedIntegrationDoc).toContain('Legacy compatibility only');

    for (const surface of QUARANTINED_IPP_SURFACES) {
      expect(normalizedIntegrationDoc.toLowerCase()).toContain(surface.toLowerCase());
    }

    expect(normalizedGapAssessmentDoc).toContain('Convex path is live');
    expect(normalizedGapAssessmentDoc).toContain('legacy/quarantined');
  });

  it('keeps the integration doc aligned with the supported live flows', () => {
    const normalizedIntegrationDoc = normalizeDoc(integrationDoc);

    for (const flow of SUPPORTED_IPP_FLOWS) {
      expect(flow.status).toBe('live');
      expect(normalizedIntegrationDoc).toContain(flow.api);
    }
  });
});
