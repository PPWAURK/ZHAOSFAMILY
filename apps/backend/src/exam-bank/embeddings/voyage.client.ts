import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ExamBankConfigService } from '../config/exam-bank-config.service';
import { normalizeVector } from './vector-codec';

export const EMBEDDING_DIMENSIONS = 1024;
const MAX_INPUTS_PER_REQUEST = 128;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;

type VoyageResponse = {
  data?: Array<{ embedding: number[]; index: number }>;
};

export type EmbeddingInputType = 'document' | 'query';

export class VoyageRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'VoyageRequestError';
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryDelayMs(response: Response | null, attempt: number): number {
  const header = Number(response?.headers.get('retry-after'));
  return Number.isFinite(header) && header > 0
    ? header * 1000
    : BASE_BACKOFF_MS * 2 ** attempt;
}

@Injectable()
export class VoyageClient {
  private readonly logger = new Logger(VoyageClient.name);

  constructor(private readonly config: ExamBankConfigService) {}

  /** Backoff pause; overridden in unit tests. */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  get model(): string {
    return this.config.embedModel;
  }

  /** Returns one unit-length vector per input, in input order. */
  async embed(
    inputs: readonly string[],
    inputType: EmbeddingInputType = 'document',
  ): Promise<Float32Array[]> {
    const vectors: Float32Array[] = [];
    for (let i = 0; i < inputs.length; i += MAX_INPUTS_PER_REQUEST) {
      const group = inputs.slice(i, i + MAX_INPUTS_PER_REQUEST);
      vectors.push(...(await this.embedGroup(group, inputType)));
    }
    return vectors;
  }

  private async embedGroup(
    input: readonly string[],
    inputType: EmbeddingInputType,
  ): Promise<Float32Array[]> {
    const apiKey = this.config.voyageApiKey;
    if (!apiKey) {
      throw new ServiceUnavailableException('EXAM_EMBEDDING_NOT_CONFIGURED');
    }
    const body = JSON.stringify({
      input,
      model: this.model,
      input_type: inputType,
      output_dimension: EMBEDDING_DIMENSIONS,
    });

    for (let attempt = 0; ; attempt += 1) {
      const response = await this.post(apiKey, body).catch((error: Error) => {
        if (attempt >= MAX_RETRIES) throw error;
        return null;
      });
      if (response?.ok) {
        return this.parse(
          (await response.json()) as VoyageResponse,
          input.length,
        );
      }
      const status = response?.status ?? 0;
      if (response && (!isRetryable(status) || attempt >= MAX_RETRIES)) {
        throw new VoyageRequestError(status, `VOYAGE_HTTP_${status}`);
      }
      this.logger.warn(`Voyage request failed (status ${status}), retrying.`);
      await this.sleep(retryDelayMs(response, attempt));
    }
  }

  private post(apiKey: string, body: string): Promise<Response> {
    return fetch(`${this.config.voyageBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  private parse(payload: VoyageResponse, expected: number): Float32Array[] {
    const data = [...(payload.data ?? [])].sort((a, b) => a.index - b.index);
    if (data.length !== expected) {
      throw new VoyageRequestError(200, 'VOYAGE_UNEXPECTED_RESPONSE');
    }
    return data.map((item) => normalizeVector(item.embedding));
  }
}
