import { EntitledRoute } from '@/components/system/EntitledRoute';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const entitlementState = vi.hoisted(() => ({ allowed: false, loading: false }));

vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({
    hasFeature: () => entitlementState.allowed,
    isLoading: entitlementState.loading,
  }),
}));

function renderGuard() {
  return render(
    <MemoryRouter>
      <EntitledRoute featureKey="clientBanking">
        <div>Banking content</div>
      </EntitledRoute>
    </MemoryRouter>
  );
}

describe('EntitledRoute', () => {
  beforeEach(() => {
    entitlementState.allowed = false;
    entitlementState.loading = false;
  });

  test('does not expose a deep-linked feature while entitlements load', () => {
    entitlementState.loading = true;
    renderGuard();
    expect(screen.getByTestId('feature-loading')).toBeInTheDocument();
    expect(screen.queryByText('Banking content')).not.toBeInTheDocument();
  });

  test('rejects a disabled direct route', () => {
    renderGuard();
    expect(screen.getByTestId('feature-not-enabled')).toBeInTheDocument();
    expect(screen.queryByText('Banking content')).not.toBeInTheDocument();
  });

  test('renders an entitled route', () => {
    entitlementState.allowed = true;
    renderGuard();
    expect(screen.getByText('Banking content')).toBeInTheDocument();
  });
});
