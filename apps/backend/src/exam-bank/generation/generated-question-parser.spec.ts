import {
  GeneratedOutputError,
  parseGeneratedQuestions,
} from './generated-question-parser';

const QUOTA = { single: 2, multiple: 1, boolean: 1 };
const CATEGORIES = new Map([['hygiene', 3]]);

const opt = (key: string) => ({ key, zh: `选项${key}`, fr: `Option ${key}` });
const base = {
  difficulty: 'recall',
  categoryCode: 'hygiene',
  knowledgePoint: '洗手时长',
  prompt: {
    zh: '洗手需要多久?',
    fr: 'Combien de temps faut-il se laver les mains ?',
  },
  explanation: { zh: '至少20秒。', fr: 'Au moins 20 secondes.' },
  evidence: '洗手至少20秒',
};
const single = {
  ...base,
  type: 'single',
  options: ['A', 'B', 'C', 'D'].map(opt),
  correctKeys: ['B'],
};
const multiple = {
  ...base,
  type: 'multiple',
  options: ['A', 'B', 'C', 'D'].map(opt),
  correctKeys: ['A', 'C'],
};
const boolean = {
  ...base,
  type: 'boolean',
  options: ['true', 'false'].map(opt),
  correctKeys: ['true'],
};

const parse = (questions: unknown[]) =>
  parseGeneratedQuestions(JSON.stringify({ questions }), QUOTA, CATEGORIES);

describe('parseGeneratedQuestions', () => {
  it('accepts valid questions of every type and maps categories', () => {
    const result = parse([single, multiple, boolean]);
    expect(result.invalidCount).toBe(0);
    expect(result.questions).toHaveLength(3);
    expect(result.questions[0]).toEqual(
      expect.objectContaining({
        type: 'single',
        difficulty: 'recall',
        categoryId: 3,
        correctKeys: ['B'],
        knowledgePoint: '洗手时长',
      }),
    );
  });

  it('rejects boolean questions with wrong keys', () => {
    const bad = {
      ...boolean,
      options: ['A', 'B'].map(opt),
      correctKeys: ['A'],
    };
    expect(parse([bad]).invalidCount).toBe(1);
  });

  it('rejects multiple choice with a single or every answer correct', () => {
    expect(parse([{ ...multiple, correctKeys: ['A'] }]).invalidCount).toBe(1);
    expect(
      parse([{ ...multiple, correctKeys: ['A', 'B', 'C', 'D'] }]).invalidCount,
    ).toBe(1);
  });

  it('rejects missing translations and correct keys outside the options', () => {
    expect(
      parse([{ ...single, prompt: { zh: '题目', fr: '' } }]).invalidCount,
    ).toBe(1);
    expect(parse([{ ...single, correctKeys: ['E'] }]).invalidCount).toBe(1);
  });

  it('maps unknown categories to null', () => {
    expect(
      parse([{ ...single, categoryCode: 'other' }]).questions[0].categoryId,
    ).toBeNull();
  });

  it('falls back to the default difficulty when the model omits it', () => {
    // JSON.stringify drops undefined, so the payload has no difficulty field.
    const withoutDifficulty = { ...single, difficulty: undefined };
    expect(parse([withoutDifficulty]).questions[0].difficulty).toBe(
      'understand',
    );
  });

  it('rejects unknown difficulty values such as the legacy scale', () => {
    expect(parse([{ ...single, difficulty: 'easy' }]).invalidCount).toBe(1);
  });

  it('forces the requested difficulty over the model output', () => {
    const result = parseGeneratedQuestions(
      JSON.stringify({ questions: [single, { ...multiple, difficulty: 'x' }] }),
      QUOTA,
      CATEGORIES,
      'scenario',
    );
    expect(result.invalidCount).toBe(0);
    expect(result.questions.map((q) => q.difficulty)).toEqual([
      'scenario',
      'scenario',
    ]);
  });

  it('drops questions beyond the quota for their type', () => {
    const result = parse([boolean, boolean]);
    expect(result.questions).toHaveLength(1);
    expect(result.invalidCount).toBe(1);
  });

  it('throws on malformed payloads', () => {
    expect(() =>
      parseGeneratedQuestions('not json', QUOTA, CATEGORIES),
    ).toThrow(GeneratedOutputError);
    expect(() =>
      parseGeneratedQuestions('{"items":[]}', QUOTA, CATEGORIES),
    ).toThrow(GeneratedOutputError);
  });
});
