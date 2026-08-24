/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. */
/**
 * CSV export helpers for admin lists.
 * Streams a client-side download without pulling extra dependencies.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (typeof value === 'object') {
    try { s = JSON.stringify(value); } catch { s = String(value); }
  } else {
    s = String(value);
  }
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (!rows.length) return '';
  const cols = columns && columns.length ? columns : Array.from(
    rows.reduce<Set<string>>((set, r) => { Object.keys(r).forEach(k => set.add(k)); return set; }, new Set()),
  );
  const head = cols.map(escapeCell).join(',');
  const body = rows.map(r => cols.map(c => escapeCell(r[c])).join(',')).join('\n');
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>, columns?: string[]): void {
  const csv = toCsv(rows, columns);
  if (!csv) return;
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.download = `${filename}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
