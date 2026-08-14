import { FeatureGate } from '@/components/system/FeatureGate';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const entitlementState = vi.hoisted(() => ({ allowed: true }));

vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({
    hasFeature: () => entitlementState.allowed,
  }),
}));

describe('FeatureGate', () => {
  beforeEach(() => {
    entitlementState.allowed = true;
  });

  test('renders children when the feature is entitled', () => {
    render(
      <FeatureGate feature="collections">
        <div>Collections panel</div>
      </FeatureGate>
    );
    expect(screen.getByText('Collections panel')).toBeInTheDocument();
  });

  test('hides children when the feature is off', () => {
    entitlementState.allowed = false;
    render(
      <FeatureGate feature="collections">
        <div>Collections panel</div>
      </FeatureGate>
    );
    expect(screen.queryByText('Collections panel')).not.toBeInTheDocument();
  });
});
