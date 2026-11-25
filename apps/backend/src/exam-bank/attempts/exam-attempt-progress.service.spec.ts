import { ExamAttemptProgressService } from './exam-attempt-progress.service';
import type { AttemptWithTemplate } from './exam-attempt.view';
import type { AttemptLayout } from './exam-sections';
import { callArg } from '../spec-helpers.testspec';

const MINUTE = 60_000;
const NOW = new Date('2026-11-24T10:00:00Z');
const at = (minutes: number) => new Date(NOW.getTime() + minutes * MINUTE);

const LAYOUT: AttemptLayout = {
  sections: [
    { titleZh: '上场', titleFr: 'P1', timeLimitMinutes: 30, questionCount: 1 },
    { titleZh: '下场', titleFr: 'P2', timeLimitMinutes: 30, questionCount: 1 },
  ],
  breakMinutes: 15,
  rules: [],
  endsAt: null,
};

const attempt = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 9,
    status: 'IN_PROGRESS',
    sectionIndex: 0,
    breakEndsAt: null,
    deadlineAt: at(10),
    layout: LAYOUT,
    answers: [{ questionId: 1, selectedKeys: ['A'] }],
    template: { passingScore: 60 },
    ...overrides,
  }) as unknown as AttemptWithTemplate;

type UpdateArgs = { where: Record<string, unknown>; data: unknown };

function buildService(reloaded: AttemptWithTemplate[] = []) {
  const findUniqueOrThrow = jest.fn();
  for (const row of reloaded) findUniqueOrThrow.mockResolvedValueOnce(row);
  const prisma = {
    examAttempt: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow,
    },
  };
  const grader = { expire: jest.fn().mockResolvedValue(undefined) };
  const service = new ExamAttemptProgressService(
    prisma as never,
    grader as never,
  );
  return { service, prisma, grader };
}

describe('ExamAttemptProgressService.settle', () => {
  it('leaves an attempt that is not overdue alone', async () => {
    // Arrange
    const { service, prisma, grader } = buildService();
    const running = attempt();

    // Act
    const result = await service.settle(running, NOW);

    // Assert
    expect(result).toBe(running);
    expect(prisma.examAttempt.updateMany).not.toHaveBeenCalled();
    expect(prisma.examAttempt.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(grader.expire).not.toHaveBeenCalled();
  });

  it('leaves an attempt alone within the grace period', async () => {
    const { service, prisma } = buildService();
    await service.settle(attempt({ deadlineAt: at(-0.5) }), NOW);
    expect(prisma.examAttempt.updateMany).not.toHaveBeenCalled();
  });

  it('advances an overdue non-last section, starting the break at the old deadline', async () => {
    // Arrange
    const deadline = at(-2);
    const advanced = attempt({
      sectionIndex: 1,
      breakEndsAt: at(13),
      deadlineAt: at(43),
    });
    const { service, prisma, grader } = buildService([advanced]);

    // Act
    const result = await service.settle(attempt({ deadlineAt: deadline }), NOW);

    // Assert
    expect(prisma.examAttempt.updateMany).toHaveBeenCalledTimes(1);
    expect(callArg<UpdateArgs>(prisma.examAttempt.updateMany)).toEqual({
      where: { id: 9, status: 'IN_PROGRESS', sectionIndex: 0 },
      data: { sectionIndex: 1, breakEndsAt: at(13), deadlineAt: at(43) },
    });
    expect(grader.expire).not.toHaveBeenCalled();
    expect(result).toBe(advanced);
  });

  it('expires an overdue last section through the grader', async () => {
    const lastSection = attempt({ sectionIndex: 1, deadlineAt: at(-2) });
    const expired = attempt({ status: 'EXPIRED' });
    const { service, prisma, grader } = buildService([expired]);

    const result = await service.settle(lastSection, NOW);

    expect(grader.expire).toHaveBeenCalledWith(lastSection, NOW);
    expect(prisma.examAttempt.updateMany).not.toHaveBeenCalled();
    expect(result).toBe(expired);
  });

  it('expires an overdue single-section paper through the grader', async () => {
    const single = attempt({ layout: null, deadlineAt: at(-2) });
    const { service, grader } = buildService([attempt({ status: 'EXPIRED' })]);
    await service.settle(single, NOW);
    expect(grader.expire).toHaveBeenCalledWith(single, NOW);
  });

  it('applies every passed deadline in turn', async () => {
    // Arrange: section 0 ended long ago, so the next one has ended too.
    const stillOverdue = attempt({
      sectionIndex: 1,
      breakEndsAt: at(-105),
      deadlineAt: at(-75),
    });
    const expired = attempt({ sectionIndex: 1, status: 'EXPIRED' });
    const { service, prisma, grader } = buildService([stillOverdue, expired]);

    // Act
    const result = await service.settle(attempt({ deadlineAt: at(-120) }), NOW);

    // Assert
    expect(prisma.examAttempt.updateMany).toHaveBeenCalledTimes(1);
    expect(grader.expire).toHaveBeenCalledWith(stillOverdue, NOW);
    expect(result).toBe(expired);
  });
});

describe('ExamAttemptProgressService.completeSection', () => {
  it('stores the answers and starts the break now, only for the expected section', async () => {
    // Arrange
    const { service, prisma } = buildService();
    const answers = [{ questionId: 1, selectedKeys: ['B'] }];

    // Act
    await service.completeSection(attempt(), answers, NOW);

    // Assert
    expect(callArg<UpdateArgs>(prisma.examAttempt.updateMany)).toEqual({
      where: { id: 9, status: 'IN_PROGRESS', sectionIndex: 0 },
      data: {
        sectionIndex: 1,
        breakEndsAt: at(15),
        deadlineAt: at(45),
        answers,
      },
    });
  });
});

describe('ExamAttemptProgressService.startSection', () => {
  const onBreak = () =>
    attempt({ sectionIndex: 1, breakEndsAt: at(10), deadlineAt: at(40) });

  it('ends the break of the named section and starts its clock now', async () => {
    const { service, prisma } = buildService();
    await service.startSection(onBreak(), 1, NOW);
    expect(callArg<UpdateArgs>(prisma.examAttempt.updateMany)).toEqual({
      where: {
        id: 9,
        status: 'IN_PROGRESS',
        sectionIndex: 1,
        breakEndsAt: at(10),
      },
      data: { sectionIndex: 1, breakEndsAt: null, deadlineAt: at(30) },
    });
  });

  it('ignores another section index', async () => {
    const { service, prisma } = buildService();
    await service.startSection(onBreak(), 0, NOW);
    expect(prisma.examAttempt.updateMany).not.toHaveBeenCalled();
  });

  it('ignores a section that already started', async () => {
    const { service, prisma } = buildService();
    await service.startSection(attempt({ breakEndsAt: null }), 0, NOW);
    await service.startSection(
      attempt({ sectionIndex: 1, breakEndsAt: at(-1) }),
      1,
      NOW,
    );
    expect(prisma.examAttempt.updateMany).not.toHaveBeenCalled();
  });

  it('ignores single-section papers', async () => {
    const { service, prisma } = buildService();
    await service.startSection(
      attempt({ layout: null, breakEndsAt: at(10) }),
      0,
      NOW,
    );
    expect(prisma.examAttempt.updateMany).not.toHaveBeenCalled();
  });
});
