import type { ExamCategory } from "@zhao/types";

import type { ExamUiLanguage } from "../constants/exam-languages";

const LOCALES: Record<ExamUiLanguage, string> = { zh: "zh-CN", en: "en-GB", fr: "fr-FR" };

export function formatDateTime(value: string | null | undefined, lang: ExamUiLanguage): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(LOCALES[lang], {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatUsd(value: number | null): string {
  return value === null ? "—" : `$${value.toFixed(2)}`;
}

/** "卫生 / Hygiène", or `fallback` when the category is unset or unknown. */
export function categoryName(
  categoryId: number | null,
  categories: readonly ExamCategory[],
  fallback: string,
): string {
  const category = categories.find((c) => c.id === categoryId);
  return category ? `${category.nameZh} / ${category.nameFr}` : fallback;
}
