import JSZip from 'jszip';
import { REPORT_STYLES, cellText, toGrid, type CellStyle, type CellStyleKey, type GridSlot, type ReportCell, type ReportLogo, type ReportSheet } from './model';

const NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"',
  'xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"',
].join(' ');

const MIME = 'application/vnd.oasis.opendocument.spreadsheet';

function xml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!);
}

/** One text:p per line; runs of spaces become text:s so they are preserved. */
function paragraphs(text: string, link?: string): string {
  return text
    .split('\n')
    .map((line) => {
      const body = xml(line).replace(/ {2,}/g, (spaces) => ` <text:s text:c="${spaces.length - 1}"/>`);
      const content = link ? `<text:a xlink:href="${xml(link)}" xlink:type="simple">${body}</text:a>` : body;
      return `<text:p>${content}</text:p>`;
    })
    .join('');
}

const ALIGN = { left: 'start', center: 'center', right: 'end' } as const;

type PercentFormat = NonNullable<ReportCell['format']>;
const PERCENT_DECIMALS: Record<PercentFormat, number> = { pct2: 2, pct0: 0 };

const styleName = (key: CellStyleKey, format?: PercentFormat) => `ce_${key}${format ? `_${format}` : ''}`;
const dataStyleName = (format: PercentFormat) => `N_${format}`;

function cellStyleXml(key: CellStyleKey, format?: PercentFormat): string {
  const style: CellStyle = REPORT_STYLES[key];
  const cellProps = [
    style.bg ? `fo:background-color="${style.bg}"` : '',
    style.border ? `fo:border="0.74pt solid ${style.border}"` : 'fo:border="none"',
    `style:vertical-align="${style.v}"`,
    `fo:wrap-option="${style.wrap ? 'wrap' : 'no-wrap'}"`,
  ].join(' ');
  const textProps = [
    `fo:color="${style.color}"`,
    `style:font-name="${style.font}"`,
    `fo:font-size="${style.size}pt"`,
    `fo:font-weight="${style.bold ? 'bold' : 'normal'}"`,
    `fo:font-style="${style.italic ? 'italic' : 'normal'}"`,
    style.underline
      ? 'style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"'
      : 'style:text-underline-style="none"',
  ].join(' ');
  return (
    `<style:style style:name="${styleName(key, format)}" style:family="table-cell" style:parent-style-name="Default"${format ? ` style:data-style-name="${dataStyleName(format)}"` : ''}>` +
    `<style:table-cell-properties ${cellProps}/>` +
    `<style:paragraph-properties fo:text-align="${ALIGN[style.h]}"/>` +
    `<style:text-properties ${textProps}/>` +
    '</style:style>'
  );
}

function percentStyleXml(format: PercentFormat): string {
  const decimals = PERCENT_DECIMALS[format];
  return `<number:percentage-style style:name="${dataStyleName(format)}"><number:number number:decimal-places="${decimals}" number:min-decimal-places="${decimals}" number:min-integer-digits="1"/><number:text>%</number:text></number:percentage-style>`;
}

function automaticStyles(sheet: ReportSheet, heights: number[]): string {
  const columns = sheet.columns
    .map((w, i) => `<style:style style:name="co${i}" style:family="table-column"><style:table-column-properties fo:break-before="auto" style:column-width="${w}in"/></style:style>`)
    .join('');
  const rows = heights
    .map((h, i) => `<style:style style:name="ro${i}" style:family="table-row"><style:table-row-properties style:row-height="${h}pt" fo:break-before="auto" style:use-optimal-row-height="false"/></style:style>`)
    .join('');
  const cells = (Object.keys(REPORT_STYLES) as CellStyleKey[])
    .flatMap((key) => [cellStyleXml(key), cellStyleXml(key, 'pct2'), cellStyleXml(key, 'pct0')])
    .join('');
  return (
    '<office:automatic-styles>' +
    columns +
    rows +
    '<style:style style:name="ta1" style:family="table" style:master-page-name="Default"><style:table-properties table:display="true" style:writing-mode="lr-tb"/></style:style>' +
    percentStyleXml('pct2') +
    percentStyleXml('pct0') +
    cells +
    '<style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="none" style:wrap="none"/></style:style>' +
    '</office:automatic-styles>'
  );
}

function spanAttrs(cell: ReportCell): string {
  const cols = cell.colSpan ?? 1;
  const rows = cell.rowSpan ?? 1;
  return cols * rows > 1 ? ` table:number-columns-spanned="${cols}" table:number-rows-spanned="${rows}"` : '';
}

function valueXml(cell: ReportCell): { attrs: string; body: string } {
  if (typeof cell.value === 'number') {
    const type = cell.format ? 'percentage' : 'float';
    return { attrs: ` office:value-type="${type}" office:value="${cell.value}"`, body: paragraphs(cellText(cell)) };
  }
  return { attrs: ' office:value-type="string"', body: cell.value ? paragraphs(cell.value, cell.link) : '' };
}

function cellXml(cell: ReportCell, logoXml: string): string {
  const open = `<table:table-cell table:style-name="${styleName(cell.style, cell.format)}"${spanAttrs(cell)}`;
  if (cell.value === '' && !logoXml) return `${open}/>`;
  const { attrs, body } = valueXml(cell);
  return `${open}${attrs}>${body}${logoXml}</table:table-cell>`;
}

function slotXml(slot: GridSlot, logoXml: string): string {
  if (slot.cell) return cellXml(slot.cell, logoXml);
  if (slot.coveredBy) return `<table:covered-table-cell table:style-name="${styleName(slot.coveredBy.style)}"/>`;
  return logoXml ? `<table:table-cell>${logoXml}</table:table-cell>` : '<table:table-cell/>';
}

const logoPath = (logo: ReportLogo) => `Pictures/logo.${logo.mime === 'image/jpeg' ? 'jpg' : 'png'}`;

function logoFrameXml(logo?: ReportLogo): string {
  if (!logo) return '';
  const width = (logo.width / 96).toFixed(4);
  const height = (logo.height / 96).toFixed(4);
  return `<draw:frame draw:z-index="0" draw:name="Logo" draw:style-name="gr1" svg:width="${width}in" svg:height="${height}in" svg:x="0in" svg:y="0in"><draw:image xlink:href="${logoPath(logo)}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"><text:p/></draw:image></draw:frame>`;
}

function contentXml(sheet: ReportSheet): string {
  const heights = sheet.rows.map((r) => r.height);
  const logoXml = logoFrameXml(sheet.logo);
  const rowsXml = toGrid(sheet)
    .map((slots, r) => {
      const cells = slots.map((slot, c) => slotXml(slot, r + c === 0 ? logoXml : '')).join('');
      return `<table:table-row table:style-name="ro${r}">${cells}</table:table-row>`;
    })
    .join('');

  const columnsXml = sheet.columns.map((_, i) => `<table:table-column table:style-name="co${i}" table:default-cell-style-name="Default"/>`).join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<office:document-content ${NS} office:version="1.3">` +
    '<office:font-face-decls>' +
    '<style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss"/>' +
    '<style:font-face style:name="Times New Roman" svg:font-family="&apos;Times New Roman&apos;" style:font-family-generic="roman"/>' +
    '</office:font-face-decls>' +
    automaticStyles(sheet, heights) +
    `<office:body><office:spreadsheet><table:table table:name="${xml(sheet.sheetName)}" table:style-name="ta1">` +
    columnsXml +
    rowsXml +
    '</table:table></office:spreadsheet></office:body></office:document-content>'
  );
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  `<office:document-styles ${NS} office:version="1.3">` +
  '<office:font-face-decls><style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss"/></office:font-face-decls>' +
  '<office:styles>' +
  '<style:default-style style:family="table-cell"><style:text-properties style:font-name="Arial" fo:font-size="10pt"/></style:default-style>' +
  '<style:style style:name="Default" style:family="table-cell"/>' +
  '</office:styles>' +
  '<office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="11.6929in" fo:page-height="8.2681in" style:print-orientation="landscape" fo:margin="0.3937in" style:scale-to-X="1" style:scale-to-Y="0"/></style:page-layout></office:automatic-styles>' +
  '<office:master-styles><style:master-page style:name="Default" style:page-layout-name="pm1"/></office:master-styles>' +
  '</office:document-styles>';

function metaXml(author: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<office:document-meta ${NS} office:version="1.3"><office:meta>` +
    `<meta:generator>ChronoWork</meta:generator><meta:initial-creator>${xml(author)}</meta:initial-creator>` +
    `<meta:creation-date>${new Date().toISOString().slice(0, 19)}</meta:creation-date>` +
    '</office:meta></office:document-meta>'
  );
}

function manifestXml(logo?: ReportLogo): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">' +
    `<manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${MIME}"/>` +
    '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>' +
    (logo ? `<manifest:file-entry manifest:full-path="${logoPath(logo)}" manifest:media-type="${logo.mime}"/>` : '') +
    '</manifest:manifest>'
  );
}

export async function renderOds(sheet: ReportSheet, author: string): Promise<Blob> {
  const zip = new JSZip();
  // The mimetype entry must come first and be stored uncompressed.
  zip.file('mimetype', MIME, { compression: 'STORE' });

  if (sheet.logo) zip.file(logoPath(sheet.logo), sheet.logo.dataUrl.split(',')[1], { base64: true });

  zip.file('content.xml', contentXml(sheet));
  zip.file('styles.xml', STYLES_XML);
  zip.file('meta.xml', metaXml(author));
  zip.file('META-INF/manifest.xml', manifestXml(sheet.logo));

  return zip.generateAsync({ type: 'blob', mimeType: MIME, compression: 'DEFLATE' });
}
