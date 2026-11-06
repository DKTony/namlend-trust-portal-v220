import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { FeesTab } from './FeesTab';

// The Radix slider measures itself with ResizeObserver, which jsdom does not provide.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const policy = (originationFeePercent: number) => ({
  originationFeePercent,
  latePaymentFeePercent: 5,
  gracePeriodDays: 5,
});

describe('FeesTab', () => {
  test('says plainly that neither fee is collected', () => {
    render(<FeesTab policy={policy(0) as never} onUpdate={vi.fn()} />);
    expect(screen.getByText(/does not charge an origination fee/i)).toBeInTheDocument();
    expect(screen.getByText(/not applied automatically/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('warns that a non-zero origination fee blocks loan agreements', () => {
    render(<FeesTab policy={policy(2) as never} onUpdate={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot be issued while this is above 0%/i);
  });
});
