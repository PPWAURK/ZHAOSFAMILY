export type CsvValue = string | number | null;

function escapeCsvCell(value: CsvValue): string {
  const raw = value === null ? "" : String(value);
  // Neutralise spreadsheet formulas (CSV injection) the same way platform reports do.
  const safe = typeof value === "string" && /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** UTF-8 BOM so Excel opens Chinese and French text correctly; CRLF line endings. */
export function buildCsv(rows: readonly (readonly CsvValue[])[]): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}
