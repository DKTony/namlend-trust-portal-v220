// Browser file-download helpers shared by export buttons
// (payment schedules, settlement reports, pacs.009 XML, analytics reports).

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** RFC 4180-safe cell quoting. */
function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  downloadBlob(buildCsv(headers, rows), filename, 'text/csv;charset=utf-8');
}

export function downloadXml(filename: string, xml: string) {
  downloadBlob(xml, filename, 'application/xml;charset=utf-8');
}
