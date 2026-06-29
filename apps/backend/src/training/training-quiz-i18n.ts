import { Prisma } from '@prisma/client';
import {
  QUIZ_LANGUAGES,
  type LocalizedText,
  type TrainingQuizTranslations,
} from './training.types';

function parseLocalized(value: unknown): LocalizedText {
  if (!value || typeof value !== 'object') return {};

  const source = value as Record<string, unknown>;
  const localized: LocalizedText = {};

  for (const lang of QUIZ_LANGUAGES) {
    const text = source[lang];
    if (typeof text === 'string' && text.trim()) {
      localized[lang] = text.trim();
    }
  }

  return localized;
}

function hasAnyText(localized: LocalizedText): boolean {
  return QUIZ_LANGUAGES.some((lang) => Boolean(localized[lang]));
}

// Reads the stored `translations` JSON back into a typed, sanitized shape, or
// null when absent/empty (old single-language questions).
export function parseTranslations(
  value: unknown,
): TrainingQuizTranslations | null {
  if (!value || typeof value !== 'object') return null;

  const source = value as Record<string, unknown>;
  const prompt = parseLocalized(source.prompt);
  const optionsSource =
    source.options && typeof source.options === 'object'
      ? (source.options as Record<string, unknown>)
      : {};
  const options: Record<string, LocalizedText> = {};

  for (const [key, optionValue] of Object.entries(optionsSource)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    const localized = parseLocalized(optionValue);
    if (hasAnyText(localized)) {
      options[key] = localized;
    }
  }

  const explanation = parseLocalized(source.explanation);

  if (!hasAnyText(prompt) && Object.keys(options).length === 0) {
    return null;
  }

  return {
    prompt,
    options,
    explanation: hasAnyText(explanation) ? explanation : null,
  };
}

// Sanitizes incoming translations for storage; returns Prisma JsonNull when
// there is nothing usable so the column is cleared rather than storing junk.
export function toTranslationsInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const parsed = parseTranslations(value);

  if (!parsed) {
    return Prisma.JsonNull;
  }

  return parsed;
}
