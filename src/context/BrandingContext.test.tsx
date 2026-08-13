import { DEFAULT_BRANDING } from '@/types/branding';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { BrandingProvider, useBranding } from './BrandingContext';

const state = vi.hoisted(() => ({
  authenticated: false,
  entitlementsLoading: false,
  enabled: false,
  profile: undefined as undefined | null | { institutionId?: string },
  tenantBranding: undefined as undefined | null | Record<string, unknown>,
}));

vi.mock('convex/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('convex/react')>();
  const { getFunctionName } = await import('convex/server');
  return {
    ...original,
    useConvexAuth: () => ({ isAuthenticated: state.authenticated, isLoading: false }),
    useQuery: (reference: unknown, args: unknown) => {
      if (args === 'skip') return undefined;
      const functionName = getFunctionName(reference as never);
      if (functionName === 'users:getMyProfile') return state.profile;
      if (functionName === 'systemConfig:getTenantBranding') return state.tenantBranding;
      return undefined;
    },
  };
});

vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({
    entitlements: new Set(state.enabled ? ['whiteLabelBranding'] : []),
    enforced: true,
    isLoading: state.entitlementsLoading,
    hasFeature: (key: string) => key === 'whiteLabelBranding' && state.enabled,
  }),
}));

function Probe() {
  const branding = useBranding();
  return (
    <div>
      <span data-testid="company-name">{branding.config.general.company_name}</span>
      <span data-testid="branding-loading">{String(branding.loading)}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <BrandingProvider>
      <Probe />
    </BrandingProvider>
  );
}

describe('BrandingProvider entitlement and tenant boundaries', () => {
  beforeEach(() => {
    state.authenticated = false;
    state.entitlementsLoading = false;
    state.enabled = false;
    state.profile = undefined;
    state.tenantBranding = undefined;
    document.title = 'Dashboard';
    document.documentElement.style.removeProperty('--brand-primary');
  });

  test('uses trusted OG branding for public and unentitled states', () => {
    const { rerender } = renderProvider();
    expect(screen.getByTestId('company-name')).toHaveTextContent(
      DEFAULT_BRANDING.general.company_name
    );

    state.authenticated = true;
    state.profile = { institutionId: 'tenant-a' };
    state.tenantBranding = {
      institutionId: 'tenant-a',
      version: 1,
      config: { general: { company_name: 'Hidden Tenant Brand' } },
    };
    rerender(
      <BrandingProvider>
        <Probe />
      </BrandingProvider>
    );
    expect(screen.getByTestId('company-name')).toHaveTextContent(
      DEFAULT_BRANDING.general.company_name
    );
  });

  test('applies the authenticated tenant override only after entitlement readiness', () => {
    state.authenticated = true;
    state.entitlementsLoading = true;
    state.enabled = true;
    state.profile = undefined;
    state.tenantBranding = undefined;
    const { rerender } = renderProvider();
    expect(screen.getByTestId('branding-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('company-name')).toHaveTextContent(
      DEFAULT_BRANDING.general.company_name
    );

    state.entitlementsLoading = false;
    state.profile = { institutionId: 'tenant-a' };
    state.tenantBranding = {
      institutionId: 'tenant-a',
      version: 2,
      config: {
        general: { company_name: 'Tenant A Finance' },
        colors: { primary_color: '#112233', use_custom_colors: true },
      },
    };
    rerender(
      <BrandingProvider>
        <Probe />
      </BrandingProvider>
    );

    expect(screen.getByTestId('company-name')).toHaveTextContent('Tenant A Finance');
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#112233');
  });

  test('resets tenant branding immediately after revocation or sign-out', async () => {
    state.authenticated = true;
    state.enabled = true;
    state.profile = { institutionId: 'tenant-a' };
    state.tenantBranding = {
      institutionId: 'tenant-a',
      version: 1,
      config: { general: { company_name: 'Tenant A Finance' } },
    };
    const { rerender } = renderProvider();
    expect(screen.getByTestId('company-name')).toHaveTextContent('Tenant A Finance');

    await act(async () => {
      state.enabled = false;
      rerender(
        <BrandingProvider>
          <Probe />
        </BrandingProvider>
      );
    });
    expect(screen.getByTestId('company-name')).toHaveTextContent(
      DEFAULT_BRANDING.general.company_name
    );

    await act(async () => {
      state.authenticated = false;
      state.profile = undefined;
      rerender(
        <BrandingProvider>
          <Probe />
        </BrandingProvider>
      );
    });
    expect(screen.getByTestId('company-name')).toHaveTextContent(
      DEFAULT_BRANDING.general.company_name
    );
  });
});
