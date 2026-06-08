"use client";

import { useCallback, useState } from "react";

const DEFAULT_LANGUAGE = "zh";
const LANGUAGE_STORAGE_KEY = "zhao_preferred_language";
const SUPPORTED_LANGUAGES = new Set(["zh", "en", "fr"]);

function readStoredLanguage() {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return SUPPORTED_LANGUAGES.has(storedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE;
}

function persistLanguage(language) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function usePreferredLanguage() {
  const [language, setLanguageState] = useState(readStoredLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    if (!SUPPORTED_LANGUAGES.has(nextLanguage)) {
      return;
    }

    persistLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  return [language, setLanguage];
}
