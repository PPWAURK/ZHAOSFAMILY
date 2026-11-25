import type { ExamContentLanguage } from "@zhao/utils";

export { pickExamText as pickText } from "@zhao/utils";
/** Question content exists in zh and fr; English UI shows the French text. */
export type { ExamContentLanguage } from "@zhao/utils";

export type ExamUiLanguage = "zh" | "en" | "fr";

export function toUiLanguage(value: unknown): ExamUiLanguage {
  return value === "en" || value === "fr" ? value : "zh";
}

export function defaultContentLanguage(lang: ExamUiLanguage): ExamContentLanguage {
  return lang === "zh" ? "zh" : "fr";
}
