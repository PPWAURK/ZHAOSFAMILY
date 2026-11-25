"use client";

import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";

import { toUiLanguage, type ExamUiLanguage } from "../constants/exam-languages";

export function useExamLanguage(): [ExamUiLanguage, (lang: ExamUiLanguage) => void] {
  const [preferred, setPreferred] = usePreferredLanguage() as [unknown, (value: string) => void];
  return [toUiLanguage(preferred), (lang) => setPreferred(lang)];
}
