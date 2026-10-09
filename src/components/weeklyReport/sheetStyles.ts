import type React from 'react';
import { REPORT_COLORS } from '../../report/model';

/** Inline styles of the report sheet preview, matching the exported template. */
export const C = REPORT_COLORS;
export const COLUMN_PCT = [4.4, 15.7, 14.6, 9.9, 7, 7, 10.1, 10.1, 21.2];
export const PREVIEW_MIN_TASK_ROWS = 8;
const cellBorder = { border: `1px solid ${C.border}` };
export const grey: React.CSSProperties = { background: C.cell, ...cellBorder };
export const light: React.CSSProperties = { background: C.cellLight, ...cellBorder };
export const head: React.CSSProperties = { background: C.header, ...cellBorder };
export const banner: React.CSSProperties = { background: C.banner, color: C.white };
export const serif: React.CSSProperties = { fontFamily: "'Times New Roman', serif", fontSize: 13 };
export const inputClass = 'w-full bg-white/80 border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500';
