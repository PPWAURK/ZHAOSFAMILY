import { arrangeOptions, sample, shuffle } from './exam-draw';
import {
  evaluateRules,
  gradeAttempt,
  isCorrect,
  validateAnswers,
  type SnapshotQuestion,
} from './exam-grading';

const seeded = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const opt = (key: string) => ({ key, zh: key, fr: key });
const question = (
  id: number,
  type: string,
  correctKeys: string[],
): SnapshotQuestion => ({
  id,
  type,
  promptZh: 'q',
  promptFr: 'q',
  options:
    type === 'boolean'
      ? ['true', 'false'].map(opt)
      : ['A', 'B', 'C', 'D'].map(opt),
  correctKeys,
  explanationZh: null,
  explanationFr: null,
});

describe('exam draw', () => {
  it('shuffles without losing or duplicating items', () => {
    const result = shuffle([1, 2, 3, 4, 5], seeded([0.1, 0.9, 0.5]));
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('samples the requested number of distinct items', () => {
    const result = sample([1, 2, 3, 4, 5, 6], 3);
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
  });

  it('shuffles choice options but keeps true before false', () => {
    const options = ['A', 'B', 'C', 'D'].map(opt);
    const arranged = arrangeOptions('single', options, true, seeded([0]));
    expect(arranged.map((o) => o.key).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(arranged.map((o) => o.key)).not.toEqual(['A', 'B', 'C', 'D']);
    expect(arrangeOptions('single', options, false).map((o) => o.key)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
    expect(
      arrangeOptions('boolean', [opt('false'), opt('true')], true).map(
        (o) => o.key,
      ),
    ).toEqual(['true', 'false']);
  });
});

describe('exam grading', () => {
  const snapshot = [
    question(1, 'single', ['B']),
    question(2, 'multiple', ['A', 'C']),
    question(3, 'boolean', ['false']),
  ];

  it('requires an exact set for multiple choice', () => {
    expect(isCorrect(['C', 'A'], ['A', 'C'])).toBe(true);
    expect(isCorrect(['A'], ['A', 'C'])).toBe(false);
    expect(isCorrect(['A', 'B', 'C'], ['A', 'C'])).toBe(false);
  });

  it('scores unanswered questions as wrong and rounds the percentage', () => {
    const grade = gradeAttempt(
      snapshot,
      [
        { questionId: 1, selectedKeys: ['B'] },
        { questionId: 2, selectedKeys: ['A', 'C'] },
      ],
      60,
    );
    expect(grade.correctCount).toBe(2);
    expect(grade.score).toBe(67);
    expect(grade.passed).toBe(true);
    expect(grade.results[2]).toEqual({ questionId: 3, isCorrect: false });
    expect(gradeAttempt(snapshot, [], 0)).toEqual(
      expect.objectContaining({ score: 0, passed: true }),
    );
  });

  it('validates answers against the attempt', () => {
    expect(
      validateAnswers(snapshot, [{ questionId: 1, selectedKeys: ['A'] }]),
    ).toBeNull();
    expect(
      validateAnswers(snapshot, [{ questionId: 9, selectedKeys: ['A'] }]),
    ).toBe('EXAM_ANSWER_QUESTION_INVALID');
    expect(
      validateAnswers(snapshot, [
        { questionId: 1, selectedKeys: ['A'] },
        { questionId: 1, selectedKeys: ['B'] },
      ]),
    ).toBe('EXAM_ANSWER_QUESTION_INVALID');
    expect(
      validateAnswers(snapshot, [{ questionId: 1, selectedKeys: ['A', 'B'] }]),
    ).toBe('EXAM_ANSWER_KEYS_INVALID');
    expect(
      validateAnswers(snapshot, [{ questionId: 3, selectedKeys: ['A'] }]),
    ).toBe('EXAM_ANSWER_KEYS_INVALID');
    expect(
      validateAnswers(snapshot, [{ questionId: 2, selectedKeys: ['A', 'C'] }]),
    ).toBeNull();
  });
});

describe('veto rules', () => {
  const CULTURE = 7;
  const inCategory = (
    id: number,
    categoryId: number | null,
  ): SnapshotQuestion => ({
    ...question(id, 'single', ['A']),
    categoryId,
  });
  // 4 culture questions + 6 others; 10 questions in all.
  const snapshot = [
    ...[1, 2, 3, 4].map((id) => inCategory(id, CULTURE)),
    ...[5, 6, 7, 8, 9, 10].map((id) => inCategory(id, 3)),
  ];
  const rule = {
    categoryId: CULTURE,
    labelZh: '企业文化',
    labelFr: 'Culture',
    maxWrong: 1,
  };
  const answerAllBut = (wrongIds: number[]) =>
    snapshot.map((q) => ({
      questionId: q.id,
      selectedKeys: wrongIds.includes(q.id) ? ['B'] : ['A'],
    }));

  it('counts wrong and unanswered questions of the rule category only', () => {
    // Arrange
    const results = snapshot.map((q) => ({
      questionId: q.id,
      isCorrect: q.id !== 1 && q.id !== 5,
    }));

    // Act
    const [result] = evaluateRules(snapshot, results, [rule]);

    // Assert
    expect(result).toEqual({
      ...rule,
      totalCount: 4,
      wrongCount: 1,
      passed: true,
    });
  });

  it('treats questions missing from the results as wrong', () => {
    const [result] = evaluateRules(snapshot, [], [rule]);
    expect(result.wrongCount).toBe(4);
    expect(result.passed).toBe(false);
  });

  it('fails the paper when a rule fails even though the score is reached', () => {
    // Act: 2 culture questions wrong → score 80, but the veto allows 1.
    const grade = gradeAttempt(snapshot, answerAllBut([1, 2]), 80, [rule]);

    // Assert
    expect(grade.score).toBe(80);
    expect(grade.passed).toBe(false);
    expect(grade.ruleResults).toEqual([
      {
        categoryId: CULTURE,
        labelZh: '企业文化',
        labelFr: 'Culture',
        maxWrong: 1,
        totalCount: 4,
        wrongCount: 2,
        passed: false,
      },
    ]);
  });

  it('passes when the score is reached and every rule holds', () => {
    const grade = gradeAttempt(snapshot, answerAllBut([1, 5]), 80, [rule]);
    expect(grade.score).toBe(80);
    expect(grade.passed).toBe(true);
    expect(grade.ruleResults[0]).toEqual(
      expect.objectContaining({ wrongCount: 1, passed: true }),
    );
  });

  it('still fails on the score alone when every rule holds', () => {
    const grade = gradeAttempt(snapshot, answerAllBut([5, 6, 7]), 80, [rule]);
    expect(grade.ruleResults[0].passed).toBe(true);
    expect(grade.passed).toBe(false);
  });

  it('returns no rule results without rules', () => {
    expect(gradeAttempt(snapshot, [], 0).ruleResults).toEqual([]);
  });
});
