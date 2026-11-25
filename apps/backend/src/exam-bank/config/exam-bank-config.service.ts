import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ExamAiEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const EFFORTS: readonly ExamAiEffort[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];
const DEFAULT_MODEL = 'claude-opus-5-5';
const DEFAULT_EMBED_MODEL = 'voyage-4';
// Voyage's own API. Keys created in MongoDB Atlas use https://ai.mongodb.com/v1.
const DEFAULT_VOYAGE_BASE_URL = 'https://api.voyageai.com/v1';
const DEFAULT_WORKER_INTERVAL_MS = 30_000;
const DEFAULT_MAX_UPLOAD_MB = 30;
const DEFAULT_MAX_QUESTIONS_PER_JOB = 1500;

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Typed access to every exam-bank environment variable. */
@Injectable()
export class ExamBankConfigService {
  constructor(private readonly configService: ConfigService) {}

  private read(key: string): string | undefined {
    const value = this.configService.get<string>(key);
    return value?.trim() || undefined;
  }

  get anthropicApiKey(): string | undefined {
    return this.read('ANTHROPIC_API_KEY');
  }

  get aiModel(): string {
    return this.read('EXAM_AI_MODEL') ?? DEFAULT_MODEL;
  }

  get aiEffort(): ExamAiEffort {
    const effort = this.read('EXAM_AI_EFFORT') as ExamAiEffort | undefined;
    return effort && EFFORTS.includes(effort) ? effort : 'medium';
  }

  get voyageApiKey(): string | undefined {
    return this.read('VOYAGE_API_KEY');
  }

  /** Base URL without trailing slash; the client appends /embeddings. */
  get voyageBaseUrl(): string {
    return (this.read('VOYAGE_BASE_URL') ?? DEFAULT_VOYAGE_BASE_URL).replace(
      /\/+$/,
      '',
    );
  }

  get embedModel(): string {
    return this.read('VOYAGE_EMBED_MODEL') ?? DEFAULT_EMBED_MODEL;
  }

  get isWorkerEnabled(): boolean {
    return this.read('EXAM_WORKER_ENABLED') !== 'false';
  }

  get workerIntervalMs(): number {
    return toPositiveInt(
      this.read('EXAM_WORKER_INTERVAL_MS'),
      DEFAULT_WORKER_INTERVAL_MS,
    );
  }

  get maxUploadBytes(): number {
    return (
      toPositiveInt(this.read('EXAM_KB_MAX_UPLOAD_MB'), DEFAULT_MAX_UPLOAD_MB) *
      1024 *
      1024
    );
  }

  get maxQuestionsPerJob(): number {
    return toPositiveInt(
      this.read('EXAM_GEN_MAX_QUESTIONS_PER_JOB'),
      DEFAULT_MAX_QUESTIONS_PER_JOB,
    );
  }

  get isAiConfigured(): boolean {
    return Boolean(this.anthropicApiKey);
  }

  get isEmbeddingConfigured(): boolean {
    return Boolean(this.voyageApiKey);
  }
}
