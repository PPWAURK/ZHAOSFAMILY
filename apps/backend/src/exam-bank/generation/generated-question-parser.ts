import {
  DEFAULT_DIFFICULTY,
  KNOWLEDGE_POINT_MAX_LENGTH,
  type QuestionDifficulty,
  type QuestionType,
} from '../exam-bank.constants';
import type { QuestionOption, TypeMix } from '../exam-bank.types';
import {
  validateQuestion,
  type QuestionContent,
} from '../questions/question-rules';

export type GeneratedQuestion = QuestionContent & {
  categoryId: number | null;
  evidence: string | null;
};

export type ParseResult = {
  questions: GeneratedQuestion[];
  invalidCount: number;
};

type Localized = { zh?: unknown; fr?: unknown };
type RawQuestion = {
  type?: unknown;
  difficulty?: unknown;
  categoryCode?: unknown;
  prompt?: Localized;
  options?: Array<{ key?: unknown; zh?: unknown; fr?: unknown }>;
  correctKeys?: unknown;
  explanation?: Localized;
  evidence?: unknown;
  knowledgePoint?: unknown;
};

export class GeneratedOutputError extends Error {
  constructor() {
    super('EXAM_GENERATION_INVALID_JSON');
  }
}

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';
const optional = (value: unknown, max = 5000): string | null =>
  text(value).slice(0, max) || null;

function toContent(
  raw: RawQuestion,
  categoryIds: ReadonlyMap<string, number>,
  difficulty: QuestionDifficulty | null,
): GeneratedQuestion {
  const options: QuestionOption[] = (
    Array.isArray(raw.options) ? raw.options : []
  ).map((o) => ({
    key: text(o?.key),
    zh: text(o?.zh),
    fr: text(o?.fr),
  }));
  return {
    type: text(raw.type) as QuestionType,
    difficulty:
      difficulty ??
      ((text(raw.difficulty) || DEFAULT_DIFFICULTY) as QuestionDifficulty),
    categoryId: categoryIds.get(text(raw.categoryCode)) ?? null,
    promptZh: text(raw.prompt?.zh),
    promptFr: text(raw.prompt?.fr),
    options,
    correctKeys: Array.isArray(raw.correctKeys)
      ? raw.correctKeys.map(text)
      : [],
    explanationZh: optional(raw.explanation?.zh),
    explanationFr: optional(raw.explanation?.fr),
    evidence: optional(raw.evidence, 1000),
    knowledgePoint: optional(raw.knowledgePoint, KNOWLEDGE_POINT_MAX_LENGTH),
  };
}

/**
 * Parses the model's structured output. Invalid questions and questions beyond
 * the requested quota for their type are counted as invalid. Throws
 * GeneratedOutputError when the payload itself is not the expected JSON.
 */
export function parseGeneratedQuestions(
  payload: string,
  quota: TypeMix,
  categoryIds: ReadonlyMap<string, number>,
  difficulty: QuestionDifficulty | null = null,
): ParseResult {
  let parsed: { questions?: unknown };
  try {
    parsed = JSON.parse(payload) as { questions?: unknown };
  } catch {
    throw new GeneratedOutputError();
  }
  if (!Array.isArray(parsed?.questions)) {
    throw new GeneratedOutputError();
  }
  const remaining = { ...quota };
  const questions: GeneratedQuestion[] = [];
  for (const raw of parsed.questions as RawQuestion[]) {
    const content = toContent(raw ?? {}, categoryIds, difficulty);
    if (validateQuestion(content) === null && remaining[content.type] > 0) {
      remaining[content.type] -= 1;
      questions.push(content);
    }
  }
  return {
    questions,
    invalidCount: parsed.questions.length - questions.length,
  };
}
