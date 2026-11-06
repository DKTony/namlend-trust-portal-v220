/**
 * Screen pagination for the loan agreement viewer (spec §6: "do not squeeze the entire
 * contract into a single overcrowded screen").
 *
 * The source document is four A4 pages; on screen it is divided by reading length:
 * whole clauses are packed onto a page up to a character budget, a clause is never
 * split, clause 18 gets its own page with the signature block, and Schedule A is split
 * by section with long repayment schedules chunked. Pure, so it is unit-tested.
 */

import type {
  AgreementClause,
  AgreementTemplateContent,
  ScheduleRow,
} from '../../../convex/lib/agreement/types';

export type DocPage =
  | { kind: 'cover'; part: 'terms'; title: string }
  | { kind: 'clauses'; part: 'terms'; title: string; clauses: AgreementClause[] }
  | { kind: 'signature'; part: 'terms'; title: string; clause: AgreementClause }
  | { kind: 'details'; part: 'schedule'; title: string }
  | { kind: 'transaction'; part: 'schedule'; title: string }
  | {
      kind: 'repayments';
      part: 'schedule';
      title: string;
      rows: ScheduleRow[];
      first: boolean;
      last: boolean;
    }
  | { kind: 'acceptance'; part: 'schedule'; title: string };

export interface SectionLink {
  label: string;
  part: 'terms' | 'schedule';
  page: number;
}

const clauseWeight = (c: AgreementClause) =>
  c.title.length +
  c.blocks.reduce((sum, b) => {
    if (b.type === 'paragraph') return sum + b.text.length;
    if (b.type === 'bullets') return sum + b.items.reduce((s, i) => s + i.length + 40, 0);
    return sum + b.rows.reduce((s, r) => s + r.term.length + r.meaning.length + 60, 0);
  }, 0);

export function paginate(
  template: AgreementTemplateContent | null,
  schedule: ScheduleRow[],
  opts: { charsPerPage?: number; rowsPerPage?: number } = {}
): { pages: DocPage[]; sections: SectionLink[] } {
  const budget = opts.charsPerPage ?? 1900;
  const rowsPerPage = opts.rowsPerPage ?? 12;
  const pages: DocPage[] = [];
  const sections: SectionLink[] = [];

  if (template) {
    pages.push({ kind: 'cover', part: 'terms', title: 'Parties and lender details' });
    sections.push({ label: 'Parties and lender details', part: 'terms', page: 0 });

    const body = template.clauses.filter((c) => c.number !== 18);
    let current: AgreementClause[] = [];
    let used = 0;
    const flush = () => {
      if (!current.length) return;
      const first = current[0].number;
      const last = current[current.length - 1].number;
      pages.push({
        kind: 'clauses',
        part: 'terms',
        title: first === last ? `Clause ${first}` : `Clauses ${first}–${last}`,
        clauses: current,
      });
      current = [];
      used = 0;
    };
    for (const clause of body) {
      const weight = clauseWeight(clause);
      if (current.length && used + weight > budget) flush();
      sections.push({
        label: `${clause.number}. ${clause.title}`,
        part: 'terms',
        page: pages.length,
      });
      current.push(clause);
      used += weight;
    }
    flush();

    const signature = template.clauses.find((c) => c.number === 18);
    if (signature) {
      sections.push({ label: `18. ${signature.title}`, part: 'terms', page: pages.length });
      pages.push({
        kind: 'signature',
        part: 'terms',
        title: 'Clause 18 — signature',
        clause: signature,
      });
    }
  }

  sections.push({ label: 'A. Lender and Borrower Details', part: 'schedule', page: pages.length });
  sections.push({ label: 'B. Borrower Banking Details', part: 'schedule', page: pages.length });
  pages.push({ kind: 'details', part: 'schedule', title: 'Schedule A — details and banking' });

  sections.push({
    label: 'C. Transaction Detail and Cost Elements',
    part: 'schedule',
    page: pages.length,
  });
  pages.push({ kind: 'transaction', part: 'schedule', title: 'Schedule A — transaction detail' });

  sections.push({ label: 'D. Repayment Schedule', part: 'schedule', page: pages.length });
  const chunks = Math.max(1, Math.ceil(schedule.length / rowsPerPage));
  for (let i = 0; i < chunks; i++) {
    pages.push({
      kind: 'repayments',
      part: 'schedule',
      title:
        chunks > 1
          ? `Schedule A — repayments (${i + 1}/${chunks})`
          : 'Schedule A — repayment schedule',
      rows: schedule.slice(i * rowsPerPage, (i + 1) * rowsPerPage),
      first: i === 0,
      last: i === chunks - 1,
    });
  }

  sections.push({ label: 'E. Borrower Acceptance', part: 'schedule', page: pages.length });
  pages.push({ kind: 'acceptance', part: 'schedule', title: 'Schedule A — acceptance' });

  return { pages, sections };
}
