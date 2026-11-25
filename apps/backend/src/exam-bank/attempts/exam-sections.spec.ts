import type { AttemptAnswer, SnapshotQuestion } from './exam-grading';
import {
  isOnBreak,
  mergeSectionAnswers,
  nextSectionTiming,
  startNowTiming,
  type AttemptLayout,
} from './exam-sections';

const MINUTE = 60_000;
const T0 = new Date('2026-11-24T09:00:00Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * MINUTE);

const layout = (overrides: Partial<AttemptLayout> = {}): AttemptLayout => ({
  sections: [
    { titleZh: '上场', titleFr: 'P1', timeLimitMinutes: 30, questionCount: 2 },
    { titleZh: '下场', titleFr: 'P2', timeLimitMinutes: 30, questionCount: 2 },
  ],
  breakMinutes: 15,
  rules: [],
  endsAt: null,
  ...overrides,
});

const question = (id: number, section: number): SnapshotQuestion => ({
  id,
  type: 'single',
  promptZh: 'q',
  promptFr: 'q',
  options: [],
  correctKeys: ['A'],
  explanationZh: null,
  explanationFr: null,
  section,
});
const answer = (questionId: number, key: string): AttemptAnswer => ({
  questionId,
  selectedKeys: [key],
});

describe('nextSectionTiming', () => {
  it('starts the break when the section ends and the next clock after it', () => {
    // Act
    const timing = nextSectionTiming(layout(), 0, T0);

    // Assert
    expect(timing).toEqual({
      sectionIndex: 1,
      breakEndsAt: at(15),
      deadlineAt: at(45),
    });
  });

  it('caps the next deadline by the session end', () => {
    const timing = nextSectionTiming(
      layout({ endsAt: at(20).toISOString() }),
      0,
      T0,
    );
    expect(timing).toEqual({
      sectionIndex: 1,
      breakEndsAt: at(15),
      deadlineAt: at(20),
    });
  });

  it('caps the break itself by the session end', () => {
    const timing = nextSectionTiming(
      layout({ endsAt: at(10).toISOString() }),
      0,
      T0,
    );
    expect(timing.breakEndsAt).toEqual(at(10));
    expect(timing.deadlineAt).toEqual(at(10));
  });

  it('has no break and starts the next clock immediately when the break is zero', () => {
    const timing = nextSectionTiming(layout({ breakMinutes: 0 }), 0, T0);
    expect(timing).toEqual({
      sectionIndex: 1,
      breakEndsAt: null,
      deadlineAt: at(30),
    });
  });

  it('leaves an untimed next section without deadline when the session has no end', () => {
    const untimed = layout();
    const timing = nextSectionTiming(
      {
        ...untimed,
        sections: [
          untimed.sections[0],
          { ...untimed.sections[1], timeLimitMinutes: null },
        ],
      },
      0,
      T0,
    );
    expect(timing.breakEndsAt).toEqual(at(15));
    expect(timing.deadlineAt).toBeNull();
  });
});

describe('startNowTiming', () => {
  it('clears the break and starts the section clock now', () => {
    expect(startNowTiming(layout(), 1, at(5))).toEqual({
      sectionIndex: 1,
      breakEndsAt: null,
      deadlineAt: at(35),
    });
  });

  it('never runs past the session end', () => {
    const timing = startNowTiming(
      layout({ endsAt: at(20).toISOString() }),
      1,
      at(5),
    );
    expect(timing.deadlineAt).toEqual(at(20));
  });
});

describe('isOnBreak', () => {
  it('is false without a break end', () => {
    expect(isOnBreak({ breakEndsAt: null }, T0)).toBe(false);
  });

  it('is true until the break end and false from then on', () => {
    const attempt = { breakEndsAt: at(15) };
    expect(isOnBreak(attempt, at(14))).toBe(true);
    expect(isOnBreak(attempt, at(15))).toBe(false);
    expect(isOnBreak(attempt, at(16))).toBe(false);
  });
});

describe('mergeSectionAnswers', () => {
  const snapshot = [question(1, 0), question(2, 0), question(3, 1)];

  it('keeps the stored answers of other sections', () => {
    // Arrange
    const stored = [answer(1, 'A'), answer(2, 'B')];

    // Act
    const merged = mergeSectionAnswers(
      snapshot,
      stored,
      [answer(3, 'C')],
      1,
      false,
    );

    // Assert
    expect(merged).toEqual([answer(1, 'A'), answer(2, 'B'), answer(3, 'C')]);
  });

  it('replaces the current section with the incoming answers', () => {
    const merged = mergeSectionAnswers(
      snapshot,
      [answer(1, 'A'), answer(2, 'B')],
      [answer(1, 'D')],
      0,
      false,
    );
    expect(merged).toEqual([answer(1, 'D')]);
  });

  it('ignores incoming answers outside the current section', () => {
    const merged = mergeSectionAnswers(
      snapshot,
      [answer(1, 'A')],
      [answer(1, 'D'), answer(3, 'C')],
      1,
      false,
    );
    expect(merged).toEqual([answer(1, 'A'), answer(3, 'C')]);
  });

  it('changes nothing during a break', () => {
    const stored = [answer(1, 'A')];
    const merged = mergeSectionAnswers(
      snapshot,
      stored,
      [answer(3, 'C')],
      1,
      true,
    );
    expect(merged).toEqual(stored);
    expect(merged).not.toBe(stored);
  });
});
