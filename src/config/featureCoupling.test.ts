import {
  ALWAYS_ON_FEATURE_DEFS,
  FEATURE_SAFETY_NETS,
  getFeature,
  getFeatureCouplingClass,
  getReverseDependents,
} from '@/config/features';
import { describe, expect, test } from 'vitest';

describe('feature coupling graph', () => {
  test('locks the six core lending features', () => {
    expect(ALWAYS_ON_FEATURE_DEFS.map((feature) => feature.key).sort()).toEqual([
      'approvals',
      'batchOps',
      'clients',
      'loans',
      'payments',
      'tenantUsers',
    ]);
    expect(
      ALWAYS_ON_FEATURE_DEFS.every((feature) => getFeatureCouplingClass(feature) === 'always-on')
    ).toBe(true);
  });

  test('declared edges have reverse dependents', () => {
    expect(getReverseDependents('clientDocuments').map((feature) => feature.key)).toEqual([
      'clientApplications',
    ]);
    expect(getReverseDependents('ippOnboarding').map((feature) => feature.key)).toEqual([
      'clientBanking',
    ]);
    expect(getReverseDependents('collections').map((feature) => feature.key)).toEqual(['mandates']);
    expect(getFeatureCouplingClass(getFeature('clientBanking')!)).toBe('declared-edge');
    expect(getFeatureCouplingClass(getFeature('mandates')!)).toBe('declared-edge');
  });

  test('safety-net keys stay independent except for declared parents', () => {
    expect(getFeatureCouplingClass(getFeature('clientPayments')!)).toBe('runtime-leak');
    expect(getFeatureCouplingClass(getFeature('clientBudget')!)).toBe('independent');
    expect(FEATURE_SAFETY_NETS.clientPayments).toMatch(/repayment/i);
    expect(FEATURE_SAFETY_NETS.workflows).toMatch(/approval/i);
  });
});
