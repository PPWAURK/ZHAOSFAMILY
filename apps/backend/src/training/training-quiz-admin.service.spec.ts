import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TrainingQuizAdminService } from './training-quiz-admin.service';

describe('TrainingQuizAdminService', () => {
  function createService() {
    const prismaService = {
      trainingMaterial: { findUnique: jest.fn() },
      trainingQuiz: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      },
      trainingQuizQuestion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    const generatorService = {
      isConfigured: jest.fn(),
      generate: jest.fn(),
    };

    return {
      prismaService,
      generatorService,
      service: new TrainingQuizAdminService(
        prismaService as never,
        generatorService as never,
      ),
    };
  }

  const validQuestionDto = {
    type: 'single' as const,
    prompt: 'Question?',
    options: [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ],
    correctKeys: ['a'],
  };

  describe('addQuestion validation', () => {
    it('rejects duplicate option keys', async () => {
      const { service } = createService();

      await expect(
        service.addQuestion(1, {
          ...validQuestionDto,
          options: [
            { key: 'a', label: 'A' },
            { key: 'a', label: 'A again' },
          ],
        }),
      ).rejects.toThrow('DUPLICATE_QUIZ_OPTION_KEYS');
    });

    it('rejects a correct key that is not among the options', async () => {
      const { service } = createService();

      await expect(
        service.addQuestion(1, { ...validQuestionDto, correctKeys: ['z'] }),
      ).rejects.toThrow('QUIZ_CORRECT_KEY_NOT_IN_OPTIONS');
    });

    it('requires exactly one correct answer for single-choice questions', async () => {
      const { service } = createService();

      await expect(
        service.addQuestion(1, {
          ...validQuestionDto,
          correctKeys: ['a', 'b'],
        }),
      ).rejects.toThrow('QUIZ_SINGLE_ANSWER_REQUIRED');
    });

    it('throws BadRequestException (400) for an invalid answer shape', async () => {
      const { service } = createService();

      await expect(
        service.addQuestion(1, { ...validQuestionDto, correctKeys: ['z'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('addQuestion happy path', () => {
    it('creates the question on an existing quiz and returns the admin view', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingQuiz.findUnique
        .mockResolvedValueOnce({ id: 99 }) // ensureQuiz
        .mockResolvedValueOnce({
          id: 99,
          materialId: 1,
          material: { title: 'Safety' },
          passingScore: 80,
          questionCount: 5,
          maxAttempts: null,
          questions: [],
        }); // buildAdminView
      prismaService.trainingQuizQuestion.findFirst.mockResolvedValue({
        sortOrder: 2,
      });
      prismaService.trainingQuizQuestion.create.mockResolvedValue({ id: 7 });

      const view = await service.addQuestion(1, validQuestionDto);

      expect(prismaService.trainingQuizQuestion.create).toHaveBeenCalledTimes(
        1,
      );
      const [createArg] = prismaService.trainingQuizQuestion.create.mock
        .calls[0] as [{ data: { quizId: number; sortOrder: number } }];
      expect(createArg.data.quizId).toBe(99);
      expect(createArg.data.sortOrder).toBe(3); // nextSortOrder = last + 1
      expect(view).toMatchObject({ quizId: 99, materialId: 1 });
    });
  });

  describe('generateDraftQuestions', () => {
    it('throws NOT_CONFIGURED when the AI provider is not configured', async () => {
      const { service, generatorService } = createService();
      generatorService.isConfigured.mockResolvedValue(false);

      await expect(service.generateDraftQuestions(1)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(generatorService.generate).not.toHaveBeenCalled();
    });

    it('throws NotFound when the material does not exist', async () => {
      const { service, generatorService, prismaService } = createService();
      generatorService.isConfigured.mockResolvedValue(true);
      prismaService.trainingMaterial.findUnique.mockResolvedValue(null);

      await expect(service.generateDraftQuestions(1)).rejects.toThrow(
        'TRAINING_MATERIAL_NOT_FOUND',
      );
    });

    it('delegates to the generator when configured and the material exists', async () => {
      const { service, generatorService, prismaService } = createService();
      generatorService.isConfigured.mockResolvedValue(true);
      const material = {
        objectKey: 'k',
        mimeType: 'application/pdf',
        title: 'Safety',
        description: null,
      };
      prismaService.trainingMaterial.findUnique.mockResolvedValue(material);
      const drafts = [{ type: 'single' }];
      generatorService.generate.mockResolvedValue(drafts);

      await expect(service.generateDraftQuestions(1, 4)).resolves.toBe(drafts);
      expect(generatorService.generate).toHaveBeenCalledWith(
        material,
        4,
        undefined,
      );
    });
  });

  describe('not-found guards', () => {
    it('deleteQuiz throws when the quiz is missing', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingQuiz.findUnique.mockResolvedValue(null);

      await expect(service.deleteQuiz(1)).rejects.toThrow(
        'TRAINING_QUIZ_NOT_FOUND',
      );
    });

    it('updateQuestion throws when the question is missing', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingQuizQuestion.findUnique.mockResolvedValue(null);

      await expect(service.updateQuestion(1, { prompt: 'x' })).rejects.toThrow(
        'TRAINING_QUIZ_QUESTION_NOT_FOUND',
      );
    });

    it('deleteQuestion throws when the question is missing', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingQuizQuestion.findUnique.mockResolvedValue(null);

      await expect(service.deleteQuestion(1)).rejects.toThrow(
        'TRAINING_QUIZ_QUESTION_NOT_FOUND',
      );
    });

    it('getQuizAdminView throws when the material is missing', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingMaterial.findUnique.mockResolvedValue(null);

      await expect(service.getQuizAdminView(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
