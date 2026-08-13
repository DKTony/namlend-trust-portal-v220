import { getAdminNavGroups } from '@/config/adminNav';
import { CLIENT_NAV_ITEMS, getEnabledClientNavItems, normalizeClientTab } from '@/config/clientNav';
import { describe, expect, test } from 'vitest';

describe('Client Portal feature navigation', () => {
  test('maps all nine client surfaces in fallback order', () => {
    expect(CLIENT_NAV_ITEMS.map((item) => item.featureKey)).toEqual([
      'clientOverview',
      'clientLoans',
      'clientApplications',
      'clientPayments',
      'clientBanking',
      'clientBudget',
      'clientDocuments',
      'clientSelfService',
      'clientProfile',
    ]);
  });

  test('filters every adaptive navigation from the same entitlement result', () => {
    const enabled = new Set(['clientLoans', 'clientDocuments']);
    expect(getEnabledClientNavItems((key) => enabled.has(key)).map((item) => item.id)).toEqual([
      'loans',
      'documents',
    ]);
    expect(getEnabledClientNavItems(() => false)).toEqual([]);
  });

  test('normalizes dashboard state without changing catalogue tab ids', () => {
    expect(normalizeClientTab('dashboard')).toBe('overview');
    expect(normalizeClientTab('banking')).toBe('banking');
  });

  test('duplicate client menu ids cannot overwrite backoffice feature ownership', () => {
    const groups = getAdminNavGroups(true, {
      enforced: true,
      hasFeature: (key) => key !== 'clientLoans' && key !== 'clientPayments',
    });
    const itemIds = groups.flatMap((group) => group.items.map((item) => item.id));
    expect(itemIds).toContain('loans');
    expect(itemIds).toContain('payments');
  });

  test('white-label branding navigation follows its backoffice entitlement', () => {
    const hidden = getAdminNavGroups(true, {
      enforced: true,
      hasFeature: (key) => key !== 'whiteLabelBranding',
    }).flatMap((group) => group.items.map((item) => item.id));
    const visible = getAdminNavGroups(true, {
      enforced: true,
      hasFeature: () => true,
    }).flatMap((group) => group.items.map((item) => item.id));

    expect(hidden).not.toContain('branding');
    expect(visible).toContain('branding');
  });
});
