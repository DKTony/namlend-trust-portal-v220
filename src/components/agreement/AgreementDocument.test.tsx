import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AgreementDocument } from './AgreementDocument';
import { agreementFixture } from './agreementFixture';

function setup(opts: Parameters<typeof agreementFixture>[0] = {}, highlightMissing = false) {
  const { built, template } = agreementFixture(opts);
  render(
    <AgreementDocument
      template={template}
      fields={built.fields}
      schedule={built.schedule}
      totals={built.totals}
      agreementNumber="OGFS-2026-000007-AG1"
      templateVersion={2}
      highlightMissing={highlightMissing}
    />
  );
  return { built, template };
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

describe('AgreementDocument', () => {
  test('starts on the cover page with the title, parties and page indicator', () => {
    const { template } = setup();
    expect(screen.getByRole('heading', { name: template.title })).toBeInTheDocument();
    expect(screen.getByText(template.parties)).toBeInTheDocument();
    expect(screen.getByText(/^Page 1 of \d+$/, { selector: '[aria-live]' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  test('every one of the 18 clause headings is reachable by paging, then Schedule A', () => {
    setup();
    const seen = new Set<number>();
    const total = Number(
      screen.getByText(/^Page 1 of \d+$/, { selector: '[aria-live]' }).textContent!.split(' of ')[1]
    );
    for (let i = 0; i < total; i++) {
      for (const h of screen.queryAllByRole('heading', { level: 3 })) {
        const m = h.textContent!.match(/^(\d+)\. /);
        if (m) seen.add(Number(m[1]));
      }
      if (i < total - 1) next();
    }
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(screen.getByRole('heading', { name: 'E. Borrower Acceptance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  test('borrower data from the application appears in Schedule A without re-entry', () => {
    setup();
    let guard = 0;
    while (
      !screen.queryByRole('heading', { name: 'A. Lender and Borrower Details' }) &&
      guard++ < 20
    )
      next();
    expect(screen.getByText('Shilongo')).toBeInTheDocument();
    expect(screen.getByText('90010112345')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
  });

  test('staff drafts highlight missing required values', () => {
    setup({ profile: { accountType: undefined } }, true);
    let guard = 0;
    while (!screen.queryByRole('heading', { name: 'B. Borrower Banking Details' }) && guard++ < 20)
      next();
    expect(screen.getByText('Missing: Account type')).toBeInTheDocument();
  });

  test('the borrower view shows a dash instead of a highlight', () => {
    setup({ profile: { accountType: undefined } }, false);
    let guard = 0;
    while (!screen.queryByRole('heading', { name: 'B. Borrower Banking Details' }) && guard++ < 20)
      next();
    expect(screen.queryByText(/^Missing:/)).toBeNull();
  });

  test('the repayment schedule shows totals that match the engine', () => {
    const { built } = setup();
    let guard = 0;
    while (!screen.queryByRole('heading', { name: 'D. Repayment Schedule' }) && guard++ < 20)
      next();
    const totalRow = screen.getByText('Total').closest('tr')!;
    expect(totalRow).toHaveTextContent(
      `N$${built.totals.totalAmountRepayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    );
  });

  test('zoom changes the reading size', () => {
    setup();
    const article = screen.getByRole('document');
    const before = article.style.fontSize;
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(article.style.fontSize).not.toBe(before);
  });
});
