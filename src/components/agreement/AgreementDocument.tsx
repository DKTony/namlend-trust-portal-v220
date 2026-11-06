/**
 * Paginated loan agreement viewer — the same document for staff (draft preview and
 * finalized record) and for the borrower. Everything shown comes from the merged
 * agreement fields, so it matches the PDF line for line.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatLongDate, formatNad } from '../../../convex/lib/agreement/format';
import type {
  AgreementBlock,
  AgreementField,
  AgreementTemplateContent,
  AgreementTotals,
  ScheduleRow,
} from '../../../convex/lib/agreement/types';
import { paginate, type DocPage } from './paginate';

export interface AgreementDocumentProps {
  template: AgreementTemplateContent | null;
  fields: AgreementField[];
  schedule: ScheduleRow[];
  totals: AgreementTotals;
  agreementNumber: string;
  templateVersion?: number | null;
  /** Staff preparing a draft: missing values are highlighted rather than shown as "—". */
  highlightMissing?: boolean;
  acceptance?: { typedName: string; acceptedAt: number; placeOfSigning: string } | null;
  className?: string;
}

const ZOOMS = [0.9, 1, 1.15, 1.3];

export function AgreementDocument(props: AgreementDocumentProps) {
  const { template, fields, schedule, agreementNumber, highlightMissing, acceptance } = props;
  const { pages, sections } = useMemo(() => paginate(template, schedule), [template, schedule]);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const surface = useRef<HTMLDivElement>(null);
  const byKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);

  useEffect(() => {
    if (page > pages.length - 1) setPage(Math.max(0, pages.length - 1));
  }, [page, pages.length]);

  const go = (next: number) => {
    setPage(Math.min(Math.max(next, 0), pages.length - 1));
    if (surface.current) surface.current.scrollTop = 0;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(page + 1);
    if (e.key === 'ArrowLeft') go(page - 1);
  };

  const current = pages[page];
  const sectionForPage = [...sections].reverse().find((s) => s.page <= page);

  /** A merged value, highlighted when missing on a staff draft. */
  const V = ({ k, fallback }: { k: string; fallback?: string }): ReactNode => {
    const field = byKey.get(k);
    if (field?.value) return field.value;
    if (fallback) return fallback;
    if (highlightMissing && field?.required) {
      return (
        <span
          className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[0.85em] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          data-missing-field={k}
        >
          Missing: {field.label}
        </span>
      );
    }
    return '—';
  };

  return (
    <div className={cn('flex flex-col gap-3', props.className)} onKeyDown={onKey}>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'shrink-0',
              current?.part === 'schedule'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-muted text-foreground'
            )}
          >
            {current?.part === 'schedule' ? 'Schedule A' : 'Standard Terms'}
          </Badge>
          <Select
            value={String(sections.indexOf(sectionForPage!))}
            onValueChange={(i) => go(sections[Number(i)].page)}
          >
            <SelectTrigger className="h-8 min-w-0 flex-1 sm:w-72" aria-label="Jump to section">
              <SelectValue placeholder="Jump to section" />
            </SelectTrigger>
            <SelectContent>
              {(['terms', 'schedule'] as const).map((part) => (
                <SelectGroup key={part}>
                  <SelectLabel>
                    {part === 'terms' ? 'Standard Terms and Conditions' : 'Schedule A'}
                  </SelectLabel>
                  {sections.map((s, i) =>
                    s.part === part ? (
                      <SelectItem key={s.label} value={String(i)}>
                        {s.label}
                      </SelectItem>
                    ) : null
                  )}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-1 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => go(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span
            className="min-w-[6.5rem] text-center text-sm tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            Page {page + 1} of {pages.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => go(page + 1)}
            disabled={page >= pages.length - 1}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])}
            disabled={zoom === ZOOMS[0]}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])}
            disabled={zoom === ZOOMS[ZOOMS.length - 1]}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Page */}
      <div
        ref={surface}
        className="max-h-[75vh] overflow-auto rounded-lg bg-muted/40 p-2 sm:p-4"
        tabIndex={0}
        aria-label="Agreement pages"
      >
        <article
          role="document"
          aria-label={`${current?.title}, page ${page + 1} of ${pages.length}`}
          className="mx-auto w-full max-w-3xl overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-sm"
          style={{ fontSize: `${0.875 * zoom}rem` }}
        >
          <div className="h-1.5 bg-primary" aria-hidden />
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 sm:px-8">
            <span className="font-semibold text-primary">
              <V k="registeredName" fallback="Lender" />
            </span>
            <span className="text-[0.8em] text-muted-foreground">
              Loan Agreement {agreementNumber}
            </span>
          </header>
          <div className="space-y-4 px-4 py-5 leading-relaxed sm:px-8 sm:py-6">
            {current && (
              <PageBody
                page={current}
                template={template}
                V={V}
                props={props}
                acceptance={acceptance}
              />
            )}
          </div>
          <footer className="flex flex-wrap justify-between gap-2 border-t border-border px-4 py-2 text-[0.75em] text-muted-foreground sm:px-8">
            <span>
              <V k="registeredName" fallback="" /> · <V k="registrationNumber" fallback="" />
            </span>
            <span>
              Page {page + 1} of {pages.length}
              {props.templateVersion ? ` · Terms v${props.templateVersion}` : ''}
            </span>
          </footer>
        </article>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

type VComponent = (p: { k: string; fallback?: string }) => ReactNode;

function PageBody({
  page,
  template,
  V,
  props,
  acceptance,
}: {
  page: DocPage;
  template: AgreementTemplateContent | null;
  V: VComponent;
  props: AgreementDocumentProps;
  acceptance: AgreementDocumentProps['acceptance'];
}) {
  const accepted = acceptance
    ? {
        by: `Accepted electronically by ${acceptance.typedName}`,
        date: formatLongDate(
          new Date(acceptance.acceptedAt + 2 * 3600_000).toISOString().slice(0, 10)
        ),
        place: acceptance.placeOfSigning,
      }
    : null;
  switch (page.kind) {
    case 'cover':
      return (
        <>
          <h2 className="text-[1.25em] font-bold text-primary">{template?.title}</h2>
          <KeyValueGrid
            rows={[
              ['Registered name', <V k="registeredName" />],
              ['Legal reg. no.', <V k="registrationNumber" />],
              ['Trading as', <V k="tradingName" />],
              ['Regulatory registration no.', <V k="regulatoryNumber" />],
              ['Trading / physical address', <V k="physicalAddress" />],
              ['Administrative office address', <V k="administrativeAddress" />],
              ['Postal address', <V k="postalAddress" />],
              ['Contact number', <V k="contactNumber" />],
              ['Website', <V k="website" />],
              ['Email', <V k="email" />],
              ['Jurisdiction', <V k="jurisdiction" />],
            ]}
          />
          <p>{template?.parties}</p>
        </>
      );
    case 'clauses':
      return (
        <>
          {page.clauses.map((clause) => (
            <section
              key={clause.number}
              aria-labelledby={`clause-${clause.number}`}
              className="space-y-2"
            >
              <h3
                id={`clause-${clause.number}`}
                className="text-[1.1em] font-semibold text-primary"
              >
                {clause.number}. {clause.title}
              </h3>
              {clause.blocks.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </section>
          ))}
        </>
      );
    case 'signature':
      return (
        <>
          <section aria-labelledby="clause-18" className="space-y-2">
            <h3 id="clause-18" className="text-[1.1em] font-semibold text-primary">
              18. {page.clause.title}
            </h3>
            {page.clause.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </section>
          <SignatureGrid
            rows={[
              ['Signed at', accepted?.place ?? ''],
              ['Date', accepted?.date ?? ''],
              ['Borrower full names', <V k="fullName" />],
              ['Borrower ID / Passport No.', <V k="idNumber" />],
              ['Borrower signature', accepted?.by ?? ''],
              ['Client No.', <V k="clientNumber" />],
            ]}
          />
          <SignatureGrid
            rows={[
              ['For OG Financial', <V k="representativeName" />],
              ['Designation', <V k="representativeDesignation" />],
              ['Authorized signature', ''],
              ['Date', ''],
            ]}
          />
        </>
      );
    case 'details':
      return (
        <>
          <ScheduleTitle
            text={template?.scheduleTitle ?? 'SCHEDULE A - LOAN QUOTATION AND REPAYMENT SCHEDULE'}
          />
          <h3 className="font-semibold text-primary">A. Lender and Borrower Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <KeyValueGrid
              caption="Lender"
              rows={[
                ['Lender', <V k="tradingName" />],
                ['Registered name', <V k="registeredName" />],
                ['Registration no.', <V k="registrationNumber" />],
                ['Regulatory no.', <V k="regulatoryNumber" />],
                ['Trading address', <V k="physicalAddress" />],
                ['Contact no.', <V k="contactNumber" />],
                ['Email', <V k="email" />],
                ['Website', <V k="website" />],
              ]}
            />
            <KeyValueGrid
              caption="Borrower"
              rows={[
                ['Client No.', <V k="clientNumber" />],
                ['Borrower surname', <V k="surname" />],
                ['Borrower full names', <V k="firstNames" />],
                ['ID / Passport no.', <V k="idNumber" />],
                ['Residential address', <V k="residentialAddress" />],
                ['Mobile no.', <V k="mobile" />],
                ['Employer', <V k="employerName" />],
                ['Employer no.', <V k="employeeNumber" />],
                ['Work address', <V k="workAddress" />],
              ]}
            />
          </div>
          <h3 className="font-semibold text-primary">B. Borrower Banking Details</h3>
          <KeyValueGrid
            rows={[
              ['Bank name', <V k="bankName" />],
              ['Account holder', <V k="accountHolderName" />],
              ['Account number', <V k="accountNumber" />],
              ['Account type', <V k="accountType" />],
              ['Branch name', <V k="branchName" />],
              ['Branch code', <V k="branchCode" />],
            ]}
          />
        </>
      );
    case 'transaction':
      return (
        <>
          <ScheduleTitle text={template?.scheduleTitle ?? 'SCHEDULE A'} />
          <h3 className="font-semibold text-primary">C. Transaction Detail and Cost Elements</h3>
          <KeyValueGrid
            numeric
            rows={(
              [
                ['Loan / Product Reference', 'productReference'],
                ['Credit Amount (N$)', 'creditAmount'],
                ['Loan Term', 'loanTerm'],
                ['Interest Rate', 'interestRate'],
                ['Interest Amount (N$)', 'interestAmount'],
                ['Initiation / Administration Fee (N$)', 'initiationFee'],
                ['Other Lawful Charges (N$)', 'otherCharges'],
                ['Total Cost of Credit (N$)', 'totalCostOfCredit'],
                ['Total Amount Repayable (N$)', 'totalAmountRepayable'],
                ['Number of Instalments', 'numberOfInstalments'],
                ['Instalment Amount (N$)', 'instalmentAmount'],
                ['Repayment Method', 'repaymentMethod'],
              ] as const
            ).map(([label, k]) => [label, <V k={k} />])}
          />
        </>
      );
    case 'repayments':
      return (
        <>
          {page.first && <h3 className="font-semibold text-primary">D. Repayment Schedule</h3>}
          {page.rows.length === 0 ? (
            <p className="text-muted-foreground">
              The schedule appears once a first repayment date is set. <V k="firstRepaymentDate" />
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-[0.92em]">
                <thead>
                  <tr className="bg-accent text-left text-accent-foreground">
                    {[
                      'Instalment No.',
                      'Due Date',
                      'Capital (N$)',
                      'Interest / Charges (N$)',
                      'Total Due (N$)',
                    ].map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={cn(
                          'border border-border px-2 py-1.5 font-semibold',
                          i > 1 && 'text-right'
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((r) => (
                    <tr key={r.installmentNumber}>
                      <td className="border border-border px-2 py-1.5">{r.installmentNumber}</td>
                      <td className="border border-border px-2 py-1.5">
                        {formatLongDate(r.dueDate)}
                      </td>
                      <td className="border border-border px-2 py-1.5 text-right tabular-nums">
                        {formatNad(r.principalDue)}
                      </td>
                      <td className="border border-border px-2 py-1.5 text-right tabular-nums">
                        {formatNad(r.interestDue)}
                      </td>
                      <td className="border border-border px-2 py-1.5 text-right tabular-nums">
                        {formatNad(r.totalDue)}
                      </td>
                    </tr>
                  ))}
                  {page.last && (
                    <tr className="bg-muted font-semibold">
                      <td className="border border-border px-2 py-1.5" colSpan={2}>
                        Total
                      </td>
                      <td className="border border-border px-2 py-1.5 text-right tabular-nums">
                        {formatNad(props.totals.creditAmount)}
                      </td>
                      <td className="border border-border px-2 py-1.5 text-right tabular-nums">
                        {formatNad(props.totals.totalCostOfCredit)}
                      </td>
                      <td className="border border-border px-2 py-1.5 text-right tabular-nums">
                        {formatNad(props.totals.totalAmountRepayable)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    case 'acceptance':
      return (
        <>
          <h3 className="font-semibold text-primary">E. Borrower Acceptance</h3>
          <p>{template?.scheduleAcceptance}</p>
          <SignatureGrid
            rows={[
              ['Borrower signature', accepted?.by ?? ''],
              ['Date', accepted?.date ?? ''],
              ['OG Financial authorized signature', ''],
              ['Date', ''],
              ['Place', accepted?.place ?? ''],
              ['Loan reference', <V k="loanReference" />],
            ]}
          />
        </>
      );
  }
}

function Block({ block }: { block: AgreementBlock }) {
  if (block.type === 'paragraph') return <p>{block.text}</p>;
  if (block.type === 'bullets') {
    return (
      <ul className="list-disc space-y-1.5 pl-5 marker:text-primary">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <dl className="divide-y divide-border rounded-md border border-border">
      <div className="hidden bg-accent px-3 py-1.5 font-semibold text-accent-foreground sm:grid sm:grid-cols-[11rem_1fr] sm:gap-3">
        <dt>Term</dt>
        <dd>Meaning</dd>
      </div>
      {block.rows.map((r) => (
        <div key={r.term} className="px-3 py-1.5 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-3">
          <dt className="font-semibold">{r.term}</dt>
          <dd>{r.meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

function ScheduleTitle({ text }: { text: string }) {
  return <h2 className="text-[1.15em] font-bold text-primary">{text}</h2>;
}

function KeyValueGrid({
  rows,
  caption,
  numeric,
}: {
  rows: [string, ReactNode][];
  caption?: string;
  numeric?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      {caption && (
        <div className="bg-accent px-3 py-1.5 text-[0.9em] font-semibold text-accent-foreground">
          {caption}
        </div>
      )}
      <dl className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-1 gap-0.5 px-3 py-1.5 sm:grid-cols-[minmax(9rem,40%)_1fr] sm:gap-3"
          >
            <dt className="text-[0.9em] text-muted-foreground">{label}</dt>
            <dd
              className={cn('break-words font-medium', numeric && 'sm:text-right sm:tabular-nums')}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Signature lines. Blank lines stay blank — they are for the parties to complete. */
function SignatureGrid({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-2">
      {rows.map(([label, value], i) => (
        <div key={`${label}-${i}`} className="flex flex-col gap-1">
          <dt className="text-[0.8em] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd className="min-h-[1.75em] border-b border-foreground/40 pb-0.5">
            {value || <span className="sr-only">Blank — to be completed</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
