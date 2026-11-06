import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { LifecycleStepper } from './LifecycleStepper';

const current = () => screen.getByRole('list').querySelector('[aria-current="step"]')?.textContent;

describe('LifecycleStepper', () => {
  test.each([
    ['draft', 'Prepare'],
    ['ready', 'Send'],
    ['sent', 'Client views'],
    ['viewed', 'Client accepts'],
    ['accepted', 'Archived'],
  ] as const)('%s → waiting on "%s"', (status, label) => {
    render(<LifecycleStepper status={status} />);
    expect(current()).toContain(label);
  });
  test('archived has nothing outstanding', () => {
    render(<LifecycleStepper status="archived" />);
    expect(current()).toBeUndefined();
  });
  test('superseded and cancelled are shown by the badge, not the stepper', () => {
    const { container } = render(<LifecycleStepper status="cancelled" />);
    expect(container).toBeEmptyDOMElement();
  });
});
