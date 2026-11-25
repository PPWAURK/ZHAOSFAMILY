import Anthropic from '@anthropic-ai/sdk';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  BatchCreateParams,
  MessageBatch,
  MessageBatchIndividualResponse,
} from '@anthropic-ai/sdk/resources/messages';
import { ExamBankConfigService } from '../config/exam-bank-config.service';

/** Thin seam over the Message Batches API so the runner can be unit tested. */
@Injectable()
export class ClaudeBatchClient {
  private sdk?: Anthropic;

  constructor(private readonly config: ExamBankConfigService) {}

  private client(): Anthropic {
    const apiKey = this.config.anthropicApiKey;
    if (!apiKey) {
      throw new ServiceUnavailableException('EXAM_AI_NOT_CONFIGURED');
    }
    this.sdk ??= new Anthropic({ apiKey });
    return this.sdk;
  }

  create(requests: BatchCreateParams.Request[]): Promise<MessageBatch> {
    return this.client().messages.batches.create({ requests });
  }

  retrieve(batchId: string): Promise<MessageBatch> {
    return this.client().messages.batches.retrieve(batchId);
  }

  cancel(batchId: string): Promise<MessageBatch> {
    return this.client().messages.batches.cancel(batchId);
  }

  /** Streams results; they arrive in any order, so callers key by custom_id. */
  async *results(
    batchId: string,
  ): AsyncGenerator<MessageBatchIndividualResponse> {
    for await (const result of await this.client().messages.batches.results(
      batchId,
    )) {
      yield result;
    }
  }
}
