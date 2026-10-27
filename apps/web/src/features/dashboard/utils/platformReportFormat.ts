import type { ReportLanguage } from "@/features/dashboard/constants/platform-report-copy";

export function formatReportRate(rate: number | null): string {
  return rate === null ? "—" : `${rate}%`;
}

export function formatReportDate(value: string, lang: ReportLanguage): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "Europe/Paris" })
    .format(new Date(value));
}
