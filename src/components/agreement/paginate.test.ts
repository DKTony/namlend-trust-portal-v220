import { describe, expect, test } from 'vitest';
import { OG_STANDARD_TERMS_V1 } from '../../../convex/lib/agreement/standardTerms';
import type { ScheduleRow } from '../../../convex/lib/agreement/types';
import { paginate } from './paginate';

const rows = (n: number): ScheduleRow[] =>
  Array.from({ length: n }, (_, i) => ({
    installmentNumber: i + 1,
    dueDate: '2026-12-05',
    dueDateMs: 0,
    principalDue: 1,
    interestDue: 1,
    totalDue: 2,
  }));

describe('paginate', () => {
  test('every clause appears exactly once, in order, and is never split', () => {
    const { pages } = paginate(OG_STANDARD_TERMS_V1, rows(3));
    const numbers = pages.flatMap((p) =>
      p.kind === 'clauses'
        ? p.clauses.map((c) => c.number)
        : p.kind === 'signature'
          ? [p.clause.number]
          : []
    );
    expect(numbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  test('uses more screen pages than the 4-page source, without overcrowding', () => {
    const { pages } = paginate(OG_STANDARD_TERMS_V1, rows(3));
    expect(pages.length).toBeGreaterThan(4);
    for (const p of pages)
      if (p.kind === 'clauses') expect(p.clauses.length).toBeLessThanOrEqual(6);
  });

  test('clause 18 sits on its own page with the signature block; Standard Terms precede Schedule A', () => {
    const { pages } = paginate(OG_STANDARD_TERMS_V1, rows(3));
    const sig = pages.findIndex((p) => p.kind === 'signature');
    expect(sig).toBeGreaterThan(0);
    expect(pages.slice(0, sig + 1).every((p) => p.part === 'terms')).toBe(true);
    expect(pages.slice(sig + 1).every((p) => p.part === 'schedule')).toBe(true);
  });

  test('long repayment schedules are chunked with the totals on the last chunk', () => {
    const { pages } = paginate(OG_STANDARD_TERMS_V1, rows(30), { rowsPerPage: 12 });
    const chunks = pages.filter((p) => p.kind === 'repayments');
    expect(
      chunks.map((c) => (c.kind === 'repayments' ? [c.rows.length, c.first, c.last] : null))
    ).toEqual([
      [12, true, false],
      [12, false, false],
      [6, false, true],
    ]);
  });

  test('section links point at the page holding that section', () => {
    const { pages, sections } = paginate(OG_STANDARD_TERMS_V1, rows(3));
    for (const s of sections.filter((x) => /^\d+\./.test(x.label))) {
      const n = Number(s.label.split('.')[0]);
      const page = pages[s.page];
      const has =
        page.kind === 'clauses'
          ? page.clauses.some((c) => c.number === n)
          : page.kind === 'signature' && n === 18;
      expect(has, s.label).toBe(true);
    }
    expect(sections.filter((s) => s.part === 'schedule').map((s) => s.label[0])).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
  });

  test('without terms, Schedule A still renders', () => {
    const { pages } = paginate(null, rows(3));
    expect(pages.every((p) => p.part === 'schedule')).toBe(true);
  });
});
