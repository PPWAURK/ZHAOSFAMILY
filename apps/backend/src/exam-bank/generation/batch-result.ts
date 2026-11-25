import type { QuestionDifficulty } from '../exam-bank.constants';
import type { MessageBatchIndividualResponse } from '@anthropic-ai/sdk/resources/messages';
import type { TypeMix } from '../exam-bank.types';
import {
  GeneratedOutputError,
  parseGeneratedQuestions,
  type GeneratedQuestion,
} from './generated-question-parser';

export type BatchResultOutcome =
  | {
      kind: 'parsed';
      questions: GeneratedQuestion[];
      invalidCount: number;
      inputTokens: number;
      outputTokens: number;
    }
  | {
      kind: 'retry';
      errorType: string;
      inputTokens: number;
      outputTokens: number;
    }
  | {
      kind: 'failed';
      errorType: string;
      inputTokens: number;
      outputTokens: number;
    };

const NON_RETRYABLE_ERRORS = new Set([
  'invalid_request_error',
  'authentication_error',
  'permission_error',
]);

/**
 * Maps one batch result to what the runner should do with its request:
 * parsed questions, a retry (expired, transient error, truncated or invalid
 * JSON — the latter two get their quota halved), or a permanent failure.
 */
export function evaluateBatchResult(
  response: MessageBatchIndividualResponse,
  quota: TypeMix,
  categoryIds: ReadonlyMap<string, number>,
  difficulty: QuestionDifficulty | null = null,
): BatchResultOutcome {
  const { result } = response;
  if (result.type === 'expired')
    return {
      kind: 'retry',
      errorType: 'expired',
      inputTokens: 0,
      outputTokens: 0,
    };
  if (result.type === 'canceled')
    return {
      kind: 'failed',
      errorType: 'canceled',
      inputTokens: 0,
      outputTokens: 0,
    };
  if (result.type === 'errored') {
    const errorType = result.error.error.type;
    return NON_RETRYABLE_ERRORS.has(errorType)
      ? { kind: 'failed', errorType, inputTokens: 0, outputTokens: 0 }
      : { kind: 'retry', errorType, inputTokens: 0, outputTokens: 0 };
  }

  const { message } = result;
  const usage = {
    inputTokens:
      message.usage.input_tokens + (message.usage.cache_read_input_tokens ?? 0),
    outputTokens: message.usage.output_tokens,
  };
  if (message.stop_reason === 'refusal')
    return { kind: 'failed', errorType: 'refusal', ...usage };
  if (message.stop_reason === 'max_tokens')
    return { kind: 'retry', errorType: 'max_tokens', ...usage };

  const text = message.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');
  try {
    return {
      kind: 'parsed',
      ...parseGeneratedQuestions(text, quota, categoryIds, difficulty),
      ...usage,
    };
  } catch (error) {
    if (error instanceof GeneratedOutputError)
      return { kind: 'retry', errorType: 'invalid_json', ...usage };
    throw error;
  }
}
