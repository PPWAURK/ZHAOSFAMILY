import type { NewsStoreRead, StoreUsage } from "@/features/dashboard/services/platformReportApi";

type CsvValue = string | number | null;

function escapeCsvCell(value: CsvValue): string {
  const raw = value === null ? "" : String(value);
  const safe = typeof value === "string" && /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function buildCsv(rows: CsvValue[][]): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function buildStoreUsageCsv(month: string, stores: StoreUsage[]): string {
  const modules = [
    ...new Set(
      stores.flatMap((store) => store.moduleUsage.map((item) => item.moduleName)),
    ),
  ].sort((left, right) => left.localeCompare(right));
  const rows: CsvValue[][] = [[
    "month", "store_code", "establishment", "approved_users_current",
    "active_users", "activity_rate_percent", "module_opens",
    "news_recipients", "news_confirmed_reads", "news_read_rate_percent",
    ...modules.map((moduleName) => `module_opens:${moduleName}`),
  ]];

  for (const store of stores) {
    const opensByModule = new Map(store.moduleUsage.map((item) => [item.moduleName, item.opens]));
    rows.push([
      month, store.storeCode, store.restaurantName, store.approvedUsers,
      store.activeUsers, store.activityRate, store.moduleOpens,
      store.expectedReads, store.confirmedReads, store.readRate,
      ...modules.map((moduleName) => opensByModule.get(moduleName) ?? 0),
    ]);
  }

  return buildCsv(rows);
}

export function buildNewsReadsCsv(month: string, rows: NewsStoreRead[]): string {
  const csvRows: CsvValue[][] = [[
    "month", "store_code", "establishment", "news_id", "news_title",
    "category", "published_at", "recipients", "confirmed_reads", "read_rate_percent",
  ]];

  for (const row of rows) {
    csvRows.push([
      month, row.storeCode, row.restaurantName, row.postId, row.title,
      row.category, row.publishedAt, row.expectedReads, row.confirmedReads, row.readRate,
    ]);
  }

  return buildCsv(csvRows);
}

export function downloadCsv(fileName: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
