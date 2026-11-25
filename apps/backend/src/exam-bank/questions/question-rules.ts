import {
  BOOLEAN_KEYS,
  CHOICE_KEYS,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  type QuestionDifficulty,
  type QuestionType,
} from '../exam-bank.constants';
import type { QuestionOption } from '../exam-bank.types';

export const MAX_PROMPT_LENGTH = 1000;

export type QuestionContent = {
  type: QuestionType;
  difficulty: QuestionDifficulty;
  promptZh: string;
  promptFr: string;
  options: QuestionOption[];
  correctKeys: string[];
  explanationZh: string | null;
  explanationFr: string | null;
  /** The single fact or rule the question tests; unique within a paper. */
  knowledgePoint: string | null;
};

const isFilled = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function optionsError(
  type: QuestionType,
  options: QuestionOption[],
): string | null {
  const keys = options.map((o) => o.key);
  if (new Set(keys).size !== keys.length) return 'EXAM_QUESTION_DUPLICATE_KEYS';
  if (options.some((o) => !isFilled(o.zh) || !isFilled(o.fr))) {
    return 'EXAM_QUESTION_OPTION_TEXT_REQUIRED';
  }
  if (type === 'boolean') {
    const sorted = [...keys].sort().join(',');
    return sorted === [...BOOLEAN_KEYS].sort().join(',')
      ? null
      : 'EXAM_QUESTION_BOOLEAN_KEYS';
  }
  if (options.length < 4 || options.length > CHOICE_KEYS.length) {
    return 'EXAM_QUESTION_OPTION_COUNT';
  }
  return keys.every((k) => (CHOICE_KEYS as readonly string[]).includes(k))
    ? null
    : 'EXAM_QUESTION_OPTION_KEYS';
}

function answerError(q: QuestionContent): string | null {
  const keys = new Set(q.options.map((o) => o.key));
  const correct = new Set(q.correctKeys);
  if (
    correct.size !== q.correctKeys.length ||
    q.correctKeys.some((k) => !keys.has(k))
  ) {
    return 'EXAM_QUESTION_CORRECT_KEYS_INVALID';
  }
  if (q.type === 'multiple') {
    return correct.size >= 2 && correct.size < keys.size
      ? null
      : 'EXAM_QUESTION_MULTIPLE_ANSWER_COUNT';
  }
  return correct.size === 1 ? null : 'EXAM_QUESTION_SINGLE_ANSWER_COUNT';
}

/**
 * Returns an error code when the question breaks the bank's rules, or null.
 * single: 4–5 options, one correct · multiple: 4–5 options, at least two
 * correct but not all · boolean: keys "true"/"false", one correct.
 */
export function validateQuestion(q: QuestionContent): string | null {
  if (!QUESTION_TYPES.includes(q.type)) return 'EXAM_QUESTION_TYPE_INVALID';
  if (!QUESTION_DIFFICULTIES.includes(q.difficulty)) {
    return 'EXAM_QUESTION_DIFFICULTY_INVALID';
  }
  if (!isFilled(q.promptZh) || !isFilled(q.promptFr))
    return 'EXAM_QUESTION_PROMPT_REQUIRED';
  if (
    q.promptZh.length > MAX_PROMPT_LENGTH ||
    q.promptFr.length > MAX_PROMPT_LENGTH
  ) {
    return 'EXAM_QUESTION_PROMPT_TOO_LONG';
  }
  return optionsError(q.type, q.options) ?? answerError(q);
}

export function normalizePromptText(text: string): string {
  return text.replace(/[\s\p{P}]/gu, '').toLowerCase();
}
