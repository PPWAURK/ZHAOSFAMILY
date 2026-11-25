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

/** Triggers a browser download of a CSV string. */
export function downloadCsv(fileName: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
