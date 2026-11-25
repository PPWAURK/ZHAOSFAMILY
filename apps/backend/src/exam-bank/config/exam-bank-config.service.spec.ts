import type { ConfigService } from '@nestjs/config';
import { ExamBankConfigService } from './exam-bank-config.service';

const withEnv = (env: Record<string, string>) =>
  new ExamBankConfigService({
    get: (key: string) => env[key],
  } as unknown as ConfigService);

describe('ExamBankConfigService', () => {
  it('defaults to the Voyage API, voyage-4 and medium effort', () => {
    const config = withEnv({});
    expect(config.voyageBaseUrl).toBe('https://api.voyageai.com/v1');
    expect(config.embedModel).toBe('voyage-4');
    expect(config.aiModel).toBe('claude-opus-5-5');
    expect(config.aiEffort).toBe('medium');
    expect(config.isAiConfigured).toBe(false);
  });

  it('accepts an Atlas base URL and strips trailing slashes', () => {
    expect(
      withEnv({ VOYAGE_BASE_URL: 'https://ai.mongodb.com/v1/' }).voyageBaseUrl,
    ).toBe('https://ai.mongodb.com/v1');
  });

  it('ignores invalid efforts and numbers', () => {
    const config = withEnv({
      EXAM_AI_EFFORT: 'turbo',
      EXAM_WORKER_INTERVAL_MS: 'abc',
    });
    expect(config.aiEffort).toBe('medium');
    expect(config.workerIntervalMs).toBe(30_000);
  });
});
