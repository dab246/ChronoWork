/**
 * Helpers that neutralize untrusted text (user input, imported backups,
 * GitHub API data) before it reaches HTML, links or spreadsheet exports.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Returns the URL only when it is an absolute http(s) URL, otherwise undefined.
 * Blocks `javascript:`, `data:`, `vbscript:` and relative URLs.
 */
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

const FORMULA_TRIGGER = /^[=@\t\r]/;
const SIGNED_TEXT = /^[+-]/;
const NUMERIC_CELL = /^[+-]?\d+(\.\d+)?%?$/;

/**
 * Prevents CSV / spreadsheet formula injection (e.g. `=HYPERLINK(...)`) by
 * prefixing cells that a spreadsheet app would evaluate with a single quote.
 */
export function neutralizeSpreadsheetCell(value: unknown): string {
  const text = String(value ?? '');
  const isFormula = FORMULA_TRIGGER.test(text) || (SIGNED_TEXT.test(text) && !NUMERIC_CELL.test(text));
  return isFormula ? `'${text}` : text;
}

/** Quotes a value for CSV output after neutralizing formulas. */
export function csvCell(value: unknown): string {
  const text = neutralizeSpreadsheetCell(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Makes a value safe for a TSV cell: no tabs/newlines breaking the grid, no formulas. */
export function tsvCell(value: unknown): string {
  return neutralizeSpreadsheetCell(String(value ?? '').replace(/[\t\r\n]+/g, ' '));
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function cleanText(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength);
}

/** Safe file-name fragment (letters, digits, dash, underscore). */
export function fileNamePart(value: string, fallback = 'report'): string {
  const cleaned = value
    .slice(0, 200)
    .normalize('NFD')
    .replace(/[\u0300-\u036F]+/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return cleaned || fallback;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
