import { ServiceUnavailableException } from '@nestjs/common';

const createMock = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: createMock } },
  })),
}));

import {
  TrainingQuizGeneratorService,
  buildGenerationBatches,
  classifyAiError,
  parseDrafts,
} from './training-quiz-generator.service';

describe('classifyAiError', () => {
  it('maps billing/credit failures to INSUFFICIENT_CREDITS', () => {
    expect(classifyAiError({ status: 402 })).toBe(
      'TRAINING_QUIZ_AI_INSUFFICIENT_CREDITS',
    );
    expect(classifyAiError({ message: 'insufficient quota' })).toBe(
      'TRAINING_QUIZ_AI_INSUFFICIENT_CREDITS',
    );
    expect(classifyAiError({ message: 'You cannot afford this' })).toBe(
      'TRAINING_QUIZ_AI_INSUFFICIENT_CREDITS',
    );
  });

  it('maps rate-limit / payload-too-large failures to RATE_LIMITED', () => {
    expect(classifyAiError({ status: 429 })).toBe(
      'TRAINING_QUIZ_AI_RATE_LIMITED',
    );
    expect(classifyAiError({ status: 413 })).toBe(
      'TRAINING_QUIZ_AI_RATE_LIMITED',
    );
    expect(classifyAiError({ message: 'tokens per minute exceeded' })).toBe(
      'TRAINING_QUIZ_AI_RATE_LIMITED',
    );
  });

  it('maps auth failures to UNAUTHORIZED', () => {
    expect(classifyAiError({ status: 401 })).toBe(
      'TRAINING_QUIZ_AI_UNAUTHORIZED',
    );
    expect(classifyAiError({ message: 'Invalid API key' })).toBe(
      'TRAINING_QUIZ_AI_UNAUTHORIZED',
    );
  });

  it('falls back to REQUEST_FAILED for anything else', () => {
    expect(classifyAiError({ status: 500 })).toBe(
      'TRAINING_QUIZ_AI_REQUEST_FAILED',
    );
    expect(classifyAiError(new Error('boom'))).toBe(
      'TRAINING_QUIZ_AI_REQUEST_FAILED',
    );
    expect(classifyAiError(undefined)).toBe('TRAINING_QUIZ_AI_REQUEST_FAILED');
  });
});

describe('buildGenerationBatches', () => {
  it('splits the count into batches of at most three', () => {
    expect(buildGenerationBatches(6).map((b) => b.count)).toEqual([3, 3]);
    expect(buildGenerationBatches(7).map((b) => b.count)).toEqual([3, 3, 1]);
    expect(buildGenerationBatches(2).map((b) => b.count)).toEqual([2]);
  });

  it('always produces at least one batch', () => {
    expect(buildGenerationBatches(0)).toHaveLength(1);
    expect(buildGenerationBatches(0)[0].count).toBe(1);
  });

  it('tags each batch with its index and total', () => {
    const batches = buildGenerationBatches(7);

    expect(batches.map((b) => b.index)).toEqual([0, 1, 2]);
    expect(batches.every((b) => b.total === 3)).toBe(true);
  });
});

describe('parseDrafts', () => {
  const trilingual = (text: string) => ({ zh: text, fr: text, bn: text });
  const validQuestion = {
    type: 'single',
    prompt: trilingual('Q'),
    options: [
      { key: 'a', label: trilingual('A') },
      { key: 'b', label: trilingual('B') },
    ],
    correctKeys: ['a'],
    explanation: trilingual('because'),
  };

  it('parses a clean trilingual question array', () => {
    const drafts = parseDrafts(JSON.stringify([validQuestion]));

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      type: 'single',
      prompt: { zh: 'Q', fr: 'Q', bn: 'Q' },
      correctKeys: ['a'],
    });
    expect(drafts[0].options).toHaveLength(2);
  });

  it('tolerates code fences and prose around the JSON array', () => {
    const wrapped = `Here you go:\n\`\`\`json\n${JSON.stringify([validQuestion])}\n\`\`\`\nDone.`;

    expect(parseDrafts(wrapped)).toHaveLength(1);
  });

  it('accepts a bare string prompt as Chinese text', () => {
    const drafts = parseDrafts(
      JSON.stringify([{ ...validQuestion, prompt: '纯中文题干' }]),
    );

    expect(drafts[0].prompt).toEqual({ zh: '纯中文题干' });
  });

  it('drops questions with fewer than two valid options', () => {
    const drafts = parseDrafts(
      JSON.stringify([
        { ...validQuestion, options: [{ key: 'a', label: trilingual('A') }] },
      ]),
    );

    expect(drafts).toHaveLength(0);
  });

  it('drops questions whose correct key is not among the options', () => {
    const drafts = parseDrafts(
      JSON.stringify([{ ...validQuestion, correctKeys: ['z'] }]),
    );

    expect(drafts).toHaveLength(0);
  });

  it('requires exactly one answer for single/boolean and at least one for multiple', () => {
    const twoAnswerSingle = parseDrafts(
      JSON.stringify([{ ...validQuestion, correctKeys: ['a', 'b'] }]),
    );
    expect(twoAnswerSingle).toHaveLength(0);

    const multiple = parseDrafts(
      JSON.stringify([
        { ...validQuestion, type: 'multiple', correctKeys: ['a', 'b'] },
      ]),
    );
    expect(multiple).toHaveLength(1);
  });

  it('returns an empty array for invalid or non-array content', () => {
    expect(parseDrafts('no json here')).toEqual([]);
    expect(parseDrafts('[not valid json')).toEqual([]);
    expect(parseDrafts('{"not":"an array"}')).toEqual([]);
  });
});

describe('TrainingQuizGeneratorService.generate', () => {
  function createService(config: Record<string, unknown> | null): {
    service: TrainingQuizGeneratorService;
    mediaService: { getFile: jest.Mock };
  } {
    const aiConfigService = {
      isConfigured: jest.fn(),
      resolveProviderConfig: jest.fn().mockResolvedValue(config),
    };
    const mediaService = { getFile: jest.fn() };

    return {
      service: new TrainingQuizGeneratorService(
        mediaService as never,
        aiConfigService as never,
      ),
      mediaService,
    };
  }

  const providerConfig = {
    apiKey: 'sk-test',
    baseURL: 'https://example.test/v1',
    model: 'test-model',
    maxTokens: 1000,
    shouldEnableReasoning: false,
    shouldDisableDeepSeekThinking: false,
  };

  const material = {
    objectKey: 'k',
    mimeType: 'text/plain',
    title: 'Food safety basics',
    description: 'Cross contamination',
  };

  const trilingual = (text: string) => ({ zh: text, fr: text, bn: text });
  const modelQuestion = {
    type: 'single',
    prompt: trilingual('Q'),
    options: [
      { key: 'a', label: trilingual('A') },
      { key: 'b', label: trilingual('B') },
    ],
    correctKeys: ['a'],
    explanation: trilingual('e'),
  };

  beforeEach(() => {
    createMock.mockReset();
  });

  it('throws NOT_CONFIGURED when no provider is configured', async () => {
    const { service } = createService(null);

    await expect(service.generate(material, 2)).rejects.toThrow(
      'TRAINING_QUIZ_AI_NOT_CONFIGURED',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('throws NO_SOURCE when the material yields no usable text', async () => {
    const { service } = createService(providerConfig);

    await expect(
      service.generate(
        { objectKey: 'k', mimeType: 'image/png', title: '', description: null },
        2,
      ),
    ).rejects.toThrow('TRAINING_QUIZ_AI_NO_SOURCE');
  });

  it('returns parsed drafts and reports progress on success', async () => {
    const { service } = createService(providerConfig);
    createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify([modelQuestion]) } }],
    });
    const onProgress = jest.fn();

    const drafts = await service.generate(material, 2, onProgress);

    expect(drafts).toHaveLength(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ total: 2, batchesDone: 1, batchesTotal: 1 }),
    );
  });

  it('maps a provider error to a classified ServiceUnavailableException', async () => {
    const { service } = createService(providerConfig);
    createMock.mockRejectedValue({ status: 402 });

    await expect(service.generate(material, 2)).rejects.toMatchObject({
      message: 'TRAINING_QUIZ_AI_INSUFFICIENT_CREDITS',
    });
    await expect(service.generate(material, 2)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
