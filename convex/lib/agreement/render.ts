/**
 * Loan agreement — A4 PDF renderer.
 *
 * Pure: (frozen snapshot + template + optional acceptance) → PDF bytes. Runs in the
 * `loanAgreementPdf` Node action, and in tests. Everything printed comes from the
 * frozen snapshot, so the PDF is the same document the borrower saw on screen.
 *
 * Print rules (spec §6): A4 pages; a header and footer with page X of Y on every page;
 * headings kept with their first lines; signature blocks never split across a page; a
 * schedule table that flows onto the next page repeats its header row.
 */

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { fieldMap, formatLongDate, formatNad, namibianDate } from './merge';
import type { AgreementSnapshot, AgreementTemplateContent } from './types';

export interface RenderInput {
  agreementNumber: string;
  templateVersion: number;
  /** Date the content was frozen. */
  finalizedAt: number;
  snapshot: AgreementSnapshot;
  template: AgreementTemplateContent;
  /** Present for the executed (signed) copy only. */
  acceptance?: {
    acceptedAt: number;
    typedName: string;
    idNumberLast4: string;
    placeOfSigning: string;
    documentSha256: string;
    consentRecordId: string;
  } | null;
}

// Brand tokens (src/index.css: --brand-primary / --brand-accent / --muted).
const GREEN = rgb(0x3f / 255, 0x71 / 255, 0x3e / 255);
const DARK_GREEN = rgb(0x27 / 255, 0x4f / 255, 0x35 / 255);
const TINT = rgb(0.933, 0.957, 0.918);
const INK = rgb(0.12, 0.14, 0.13);
const GREY = rgb(0.4, 0.42, 0.41);
const RULE = rgb(0.82, 0.86, 0.8);

const A4: [number, number] = [595.28, 841.89];
const MARGIN_X = 50;
const TOP = 790;
const BOTTOM = 70;
const WIDTH = A4[0] - MARGIN_X * 2;

class Writer {
  doc!: PDFDocument;
  regular!: PDFFont;
  bold!: PDFFont;
  page!: PDFPage;
  y = TOP;

  static async create(): Promise<Writer> {
    const w = new Writer();
    // updateMetadata:false — otherwise pdf-lib stamps the current time on save, and the
    // same agreement would hash differently every time it is rendered.
    w.doc = await PDFDocument.create({ updateMetadata: false });
    w.regular = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    w.newPage();
    return w;
  }

  newPage() {
    this.page = this.doc.addPage(A4);
    this.y = TOP;
  }

  /** Start a new page unless `height` still fits above the footer. */
  ensure(height: number) {
    if (this.y - height < BOTTOM) this.newPage();
  }

  /**
   * Standard fonts use WinAnsi encoding. Typographic quotes and dashes are covered;
   * anything else (e.g. a click consonant in a name) is reduced to its base letter
   * rather than failing the whole render.
   */
  safe(text: string, font: PDFFont = this.regular): string {
    let out = '';
    for (const ch of text) {
      try {
        font.encodeText(ch);
        out += ch;
      } catch {
        const base = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
        try {
          font.encodeText(base);
          out += base;
        } catch {
          out += '?';
        }
      }
    }
    return out;
  }

  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const para of this.safe(text, font).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        // A single token wider than the line (a hash, a long reference) breaks by character.
        let rest = word;
        while (font.widthOfTextAtSize(rest, size) > width) {
          let cut = rest.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
          lines.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
      lines.push(line);
    }
    return lines;
  }

  text(
    s: string,
    x: number,
    y: number,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}
  ) {
    const font = opts.font ?? this.regular;
    this.page.drawText(this.safe(s, font), {
      x,
      y,
      size: opts.size ?? 9,
      font,
      color: opts.color ?? INK,
    });
  }

  paragraph(
    s: string,
    opts: {
      size?: number;
      indent?: number;
      gapAfter?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
    } = {}
  ) {
    const size = opts.size ?? 9;
    const lead = size * 1.38;
    const indent = opts.indent ?? 0;
    const lines = this.wrap(s, opts.font ?? this.regular, size, WIDTH - indent);
    for (const line of lines) {
      this.ensure(lead);
      this.text(line, MARGIN_X + indent, this.y - size, {
        size,
        font: opts.font,
        color: opts.color,
      });
      this.y -= lead;
    }
    this.y -= opts.gapAfter ?? 6;
  }

  /** Heading kept together with at least two lines of what follows. */
  heading(s: string, size = 11) {
    this.ensure(size * 1.6 + 30);
    this.y -= 6;
    this.text(s, MARGIN_X, this.y - size, { font: this.bold, size, color: DARK_GREEN });
    this.y -= size * 1.6;
  }

  rule(color = RULE, thickness = 0.6) {
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: MARGIN_X + WIDTH, y: this.y },
      thickness,
      color,
    });
  }

  /**
   * Bordered table. `widths` are fractions of the content width. Rows never split;
   * when a table flows onto a new page its header row is repeated.
   */
  table(
    widths: number[],
    rows: string[][],
    opts: {
      header?: string[];
      size?: number;
      boldFirstColumn?: boolean;
      align?: ('left' | 'right')[];
    } = {}
  ) {
    const size = opts.size ?? 8.5;
    const pad = 4;
    const cols = widths.map((w) => w * WIDTH);
    const lead = size * 1.3;
    const measure = (row: string[], bold: (i: number) => boolean) =>
      row.map((cell, i) =>
        this.wrap(cell || '—', bold(i) ? this.bold : this.regular, size, cols[i] - pad * 2)
      );
    const drawRow = (row: string[], header: boolean) => {
      const bold = (i: number) => header || (Boolean(opts.boldFirstColumn) && i % 2 === 0);
      const wrapped = measure(row, bold);
      const height = Math.max(...wrapped.map((l) => l.length)) * lead + pad * 2;
      return { wrapped, height, bold };
    };
    const paint = (r: ReturnType<typeof drawRow>, header: boolean) => {
      let x = MARGIN_X;
      if (header)
        this.page.drawRectangle({
          x,
          y: this.y - r.height,
          width: WIDTH,
          height: r.height,
          color: TINT,
        });
      r.wrapped.forEach((lines, i) => {
        this.page.drawRectangle({
          x,
          y: this.y - r.height,
          width: cols[i],
          height: r.height,
          borderColor: RULE,
          borderWidth: 0.6,
        });
        lines.forEach((line, k) => {
          const font = r.bold(i) ? this.bold : this.regular;
          const right = opts.align?.[i] === 'right';
          const tx = right ? x + cols[i] - pad - font.widthOfTextAtSize(line, size) : x + pad;
          this.text(line, tx, this.y - pad - size - k * lead + 1.5, {
            font,
            size,
            color: header ? DARK_GREEN : INK,
          });
        });
        x += cols[i];
      });
      this.y -= r.height;
    };
    const header = opts.header ? drawRow(opts.header, true) : null;
    if (header) {
      this.ensure(header.height + 20);
      paint(header, true);
    }
    for (const row of rows) {
      const r = drawRow(row, false);
      if (this.y - r.height < BOTTOM) {
        this.newPage();
        if (header) paint(drawRow(opts.header!, true), true);
      }
      paint(r, false);
    }
    this.y -= 10;
  }

  /** Signature lines, kept together on one page. */
  signatureBlock(pairs: [string, string][]) {
    const rowHeight = 30;
    this.ensure(pairs.length * rowHeight + 10);
    for (const [label, value] of pairs) {
      this.text(label, MARGIN_X, this.y - 10, { font: this.bold, size: 9 });
      const lineX = MARGIN_X + 170;
      this.page.drawLine({
        start: { x: lineX, y: this.y - 13 },
        end: { x: MARGIN_X + WIDTH, y: this.y - 13 },
        thickness: 0.6,
        color: GREY,
      });
      if (value) this.text(value, lineX + 2, this.y - 10, { size: 9 });
      this.y -= rowHeight;
    }
    this.y -= 4;
  }
}

/** Render the agreement. Returns the PDF bytes. */
export async function renderAgreementPdf(input: RenderInput): Promise<Uint8Array> {
  const w = await Writer.create();
  const f = fieldMap(input.snapshot.fields);
  const t = input.template;
  const a = input.acceptance ?? null;
  const val = (key: string) => f[key] ?? '—';
  const acceptedDate = a ? formatLongDate(namibianDate(a.acceptedAt)) : '';

  w.doc.setTitle(`Loan Agreement ${input.agreementNumber}`);
  w.doc.setSubject(t.title);
  w.doc.setAuthor(val('registeredName'));
  w.doc.setProducer('NamLend Trust Portal');
  // Fixed dates keep the bytes — and so the SHA-256 — reproducible for the same input.
  w.doc.setCreationDate(new Date(input.finalizedAt));
  w.doc.setModificationDate(new Date(a?.acceptedAt ?? input.finalizedAt));

  // ---- Part 1: Standard Terms ---------------------------------------------------
  w.paragraph(t.title, { size: 13, font: w.bold, color: DARK_GREEN, gapAfter: 8 });
  w.table(
    [0.22, 0.28, 0.22, 0.28],
    [
      ['Registered name', val('registeredName'), 'Legal reg. no.', val('registrationNumber')],
      ['Trading as', val('tradingName'), 'Regulatory registration no.', val('regulatoryNumber')],
      [
        'Trading / physical address',
        val('physicalAddress'),
        'Administrative office address',
        val('administrativeAddress'),
      ],
      ['Postal address', val('postalAddress'), 'Contact number', val('contactNumber')],
      [
        'Website / email',
        [f.website, f.email].filter(Boolean).join(' / ') || '—',
        'Jurisdiction',
        val('jurisdiction'),
      ],
    ],
    { boldFirstColumn: true, size: 8 }
  );
  w.paragraph(t.parties, { gapAfter: 8 });

  for (const clause of t.clauses) {
    w.heading(`${clause.number}. ${clause.title}`);
    for (const block of clause.blocks) {
      if (block.type === 'paragraph') w.paragraph(block.text);
      else if (block.type === 'bullets') {
        for (const item of block.items) {
          const lines = w.wrap(item, w.regular, 9, WIDTH - 16);
          w.ensure(lines.length * 12.4);
          w.page.drawCircle({ x: MARGIN_X + 5, y: w.y - 6.2, size: 1.6, color: GREEN });
          w.paragraph(item, { indent: 16, gapAfter: 2 });
        }
        w.y -= 4;
      } else {
        w.table(
          [0.3, 0.7],
          block.rows.map((r) => [r.term, r.meaning]),
          { header: ['Term', 'Meaning'] }
        );
      }
    }
    if (clause.number === 18) {
      w.signatureBlock([
        ['Signed at:', a ? a.placeOfSigning : ''],
        ['Date:', acceptedDate],
        ['Borrower full names:', val('fullName')],
        ['Borrower ID / Passport No.:', val('idNumber')],
        ['Borrower signature:', a ? `Accepted electronically by ${a.typedName}` : ''],
        ['Client No.:', val('clientNumber')],
      ]);
      w.signatureBlock([
        ['For OG Financial:', val('representativeName')],
        ['Designation:', val('representativeDesignation')],
        ['Authorized signature:', ''],
        ['Date:', ''],
      ]);
    }
  }

  // ---- Part 2: Schedule A -------------------------------------------------------
  w.newPage();
  w.paragraph(t.scheduleTitle, { size: 13, font: w.bold, color: DARK_GREEN, gapAfter: 8 });
  w.heading('A. Lender and Borrower Details', 10);
  w.table(
    [0.2, 0.3, 0.2, 0.3],
    [
      ['Lender', val('tradingName'), 'Client No.', val('clientNumber')],
      ['Registered name', val('registeredName'), 'Borrower surname', val('surname')],
      ['Registration no.', val('registrationNumber'), 'Borrower full names', val('firstNames')],
      ['Regulatory no.', val('regulatoryNumber'), 'ID / Passport no.', val('idNumber')],
      ['Trading address', val('physicalAddress'), 'Residential address', val('residentialAddress')],
      ['Contact no.', val('contactNumber'), 'Mobile no.', val('mobile')],
      ['Email', val('email'), 'Employer', val('employerName')],
      ['Website', val('website'), 'Employer no.', val('employeeNumber')],
      // ' ' = intentionally blank (no lender field on this row), unlike a missing value.
      [' ', ' ', 'Work address', val('workAddress')],
    ],
    { boldFirstColumn: true, size: 8 }
  );
  w.heading('B. Borrower Banking Details', 10);
  w.table(
    [0.2, 0.3, 0.2, 0.3],
    [
      ['Bank name', val('bankName'), 'Account holder', val('accountHolderName')],
      ['Account number', val('accountNumber'), 'Account type', val('accountType')],
      ['Branch name', val('branchName'), 'Branch code', val('branchCode')],
    ],
    { boldFirstColumn: true, size: 8 }
  );
  w.heading('C. Transaction Detail and Cost Elements', 10);
  w.table(
    [0.5, 0.5],
    [
      'productReference',
      'creditAmount',
      'loanTerm',
      'interestRate',
      'interestAmount',
      'initiationFee',
      'otherCharges',
      'totalCostOfCredit',
      'totalAmountRepayable',
      'numberOfInstalments',
      'instalmentAmount',
      'repaymentMethod',
    ].map((key) => [input.snapshot.fields.find((x) => x.key === key)?.label ?? key, val(key)]),
    { boldFirstColumn: true, size: 8.5, align: ['left', 'right'] }
  );
  w.heading('D. Repayment Schedule', 10);
  const s = input.snapshot;
  w.table(
    [0.14, 0.26, 0.2, 0.2, 0.2],
    [
      ...s.schedule.map((r) => [
        String(r.installmentNumber),
        formatLongDate(r.dueDate),
        formatNad(r.principalDue),
        formatNad(r.interestDue),
        formatNad(r.totalDue),
      ]),
      [
        'Total',
        '',
        formatNad(s.totals.creditAmount),
        formatNad(s.totals.totalCostOfCredit),
        formatNad(s.totals.totalAmountRepayable),
      ],
    ],
    {
      header: [
        'Instalment No.',
        'Due Date',
        'Capital (N$)',
        'Interest / Charges (N$)',
        'Total Due (N$)',
      ],
      align: ['left', 'left', 'right', 'right', 'right'],
    }
  );
  w.heading('E. Borrower Acceptance', 10);
  w.paragraph(t.scheduleAcceptance, { gapAfter: 10 });
  w.signatureBlock([
    ['Borrower signature:', a ? `Accepted electronically by ${a.typedName}` : ''],
    ['Date:', acceptedDate],
    ['OG Financial authorized signature:', ''],
    ['Date:', ''],
    ['Place:', a ? a.placeOfSigning : ''],
    ['Loan reference:', val('loanReference')],
  ]);

  // ---- Executed copy: electronic acceptance record --------------------------------
  if (a) {
    w.heading('Electronic Acceptance Record', 10);
    w.table(
      [0.32, 0.68],
      [
        ['Agreement', input.agreementNumber],
        ['Accepted by', `${a.typedName} (ID ending ${a.idNumberLast4})`],
        [
          'Accepted at',
          `${formatLongDate(namibianDate(a.acceptedAt))}, ${new Date(a.acceptedAt + 2 * 3600_000).toISOString().slice(11, 16)} (Windhoek)`,
        ],
        ['Place of signing', a.placeOfSigning],
        ['Issued document SHA-256', a.documentSha256],
        ['Consent record', a.consentRecordId],
        [
          'Method',
          'Authenticated in-app acceptance: typed full name, ID confirmation and explicit agreement to the statement in Schedule A, section E.',
        ],
      ],
      { boldFirstColumn: true, size: 8 }
    );
  }

  // ---- Header and footer on every page -------------------------------------------
  const pages = w.doc.getPages();
  const footer = [val('registeredName'), val('registrationNumber'), val('physicalAddress')].join(
    ' | '
  );
  pages.forEach((page, i) => {
    w.page = page;
    page.drawRectangle({ x: 0, y: A4[1] - 6, width: A4[0], height: 6, color: GREEN });
    w.text(val('registeredName'), MARGIN_X, A4[1] - 30, {
      font: w.bold,
      size: 9,
      color: DARK_GREEN,
    });
    const ref = `Loan Agreement ${input.agreementNumber}${a ? ' — EXECUTED' : ''}`;
    w.text(ref, A4[0] - MARGIN_X - w.bold.widthOfTextAtSize(w.safe(ref, w.bold), 8), A4[1] - 30, {
      font: w.bold,
      size: 8,
      color: GREY,
    });
    page.drawLine({
      start: { x: MARGIN_X, y: A4[1] - 38 },
      end: { x: A4[0] - MARGIN_X, y: A4[1] - 38 },
      thickness: 0.8,
      color: GREEN,
    });
    page.drawLine({
      start: { x: MARGIN_X, y: 48 },
      end: { x: A4[0] - MARGIN_X, y: 48 },
      thickness: 0.6,
      color: RULE,
    });
    const footerLines = w.wrap(footer, w.regular, 6.8, WIDTH - 90);
    footerLines.forEach((line, k) =>
      w.text(line, MARGIN_X, 38 - k * 9, { size: 6.8, color: GREY })
    );
    const pageLabel = `Page ${i + 1} of ${pages.length} · Terms v${input.templateVersion}`;
    w.text(pageLabel, A4[0] - MARGIN_X - w.regular.widthOfTextAtSize(pageLabel, 6.8), 38, {
      size: 6.8,
      color: GREY,
    });
  });

  return w.doc.save({ useObjectStreams: false });
}
