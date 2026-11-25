import { BadRequestException } from '@nestjs/common';
import {
  QuestionReviewService,
  buildQuestionWhere,
} from './question-review.service';
import { partial } from '../spec-helpers.testspec';

const NOW = new Date('2026-11-18T10:00:00Z');
const opt = (key: string) => ({ key, zh: `选${key}`, fr: `Opt ${key}` });
const row = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  type: 'single',
  status: 'DRAFT',
  origin: 'AI',
  difficulty: 'recall',
  categoryId: null,
  category: null,
  sourceMaterial: null,
  promptZh: '洗手多久?',
  promptFr: 'Combien de temps ?',
  options: ['A', 'B', 'C', 'D'].map(opt),
  correctKeys: ['A'],
  explanationZh: null,
  explanationFr: null,
  evidence: null,
  knowledgePoint: '洗手时长',
  sourceChunkId: null,
  generationJobId: null,
  rejectReason: null,
  reviewedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

function buildService() {
  const prisma = {
    examQuestion: {
      findUnique: jest.fn().mockResolvedValue(row()),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue(row({ status: 'APPROVED' })),
      update: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve(row(args.data)),
      ),
      create: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve(row(args.data)),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
  };
  return { service: new QuestionReviewService(prisma as never), prisma };
}

describe('buildQuestionWhere', () => {
  it('maps filters and searches both languages and the knowledge point', () => {
    expect(
      buildQuestionWhere({ status: 'DRAFT', jobId: 4, q: ' 洗手 ' }),
    ).toEqual({
      status: 'DRAFT',
      type: undefined,
      difficulty: undefined,
      categoryId: undefined,
      sourceMaterialId: undefined,
      generationJobId: 4,
      OR: [
        { promptZh: { contains: '洗手' } },
        { promptFr: { contains: '洗手' } },
        { knowledgePoint: { contains: '洗手' } },
      ],
    });
  });

  it('filters by difficulty', () => {
    expect(buildQuestionWhere({ difficulty: 'scenario' })).toEqual(
      expect.objectContaining({ difficulty: 'scenario' }),
    );
  });
});

describe('QuestionReviewService', () => {
  it('creates manual questions as APPROVED after validating them', async () => {
    const { service, prisma } = buildService();
    await service.create(
      {
        type: 'multiple',
        promptZh: '多选',
        promptFr: 'Plusieurs',
        options: ['A', 'B', 'C', 'D'].map(opt),
        correctKeys: ['A', 'B'],
      },
      7,
    );
    expect(prisma.examQuestion.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        origin: 'MANUAL',
        status: 'APPROVED',
        reviewedByUserId: 7,
      }),
    );
    await expect(
      service.create(
        {
          type: 'multiple',
          promptZh: 'x',
          promptFr: 'y',
          options: ['A', 'B', 'C', 'D'].map(opt),
          correctKeys: ['A'],
        },
        7,
      ),
    ).rejects.toEqual(
      new BadRequestException('EXAM_QUESTION_MULTIPLE_ANSWER_COUNT'),
    );
  });

  it('clears the embedding when the chinese prompt changes', async () => {
    const { service, prisma } = buildService();
    await service.update(1, { promptZh: '新的题目' });
    expect(prisma.examQuestion.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ promptZh: '新的题目', promptEmbedding: null }),
    );
  });

  it('keeps the knowledge point unless the edit changes it, and trims it', async () => {
    const { service, prisma } = buildService();
    await service.update(1, { correctKeys: ['B'] });
    await service.update(1, { knowledgePoint: '  洗手20秒 ' });
    await service.update(1, { knowledgePoint: '   ' });
    const knowledgePoints = prisma.examQuestion.update.mock.calls.map(
      (c) => c[0].data.knowledgePoint,
    );
    expect(knowledgePoints).toEqual(['洗手时长', '洗手20秒', null]);
  });

  it('keeps the embedding for other edits', async () => {
    const { service, prisma } = buildService();
    await service.update(1, { correctKeys: ['B'] });
    expect(prisma.examQuestion.update.mock.calls[0][0].data).not.toHaveProperty(
      'promptEmbedding',
    );
  });

  it('bulk reviews with a reason only for rejections', async () => {
    const { service, prisma } = buildService();
    await expect(
      service.bulkReview(
        { ids: [1, 2, 2], action: 'reject', reason: ' faux ' },
        3,
      ),
    ).resolves.toEqual({
      updated: 2,
    });
    expect(prisma.examQuestion.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: partial({
        status: 'REJECTED',
        rejectReason: 'faux',
        reviewedByUserId: 3,
      }),
    });
  });
});
