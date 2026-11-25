import type { MessageBatchIndividualResponse } from '@anthropic-ai/sdk/resources/messages';
import { evaluateBatchResult } from './batch-result';
import { errored, singleQuestion, succeeded } from './batch-fixtures.testspec';

const QUOTA = { single: 1, multiple: 0, boolean: 0 };
const evaluate = (response: MessageBatchIndividualResponse) =>
  evaluateBatchResult(response, QUOTA, new Map());

describe('evaluateBatchResult', () => {
  it('parses succeeded results, ignoring thinking blocks, and sums usage', () => {
    const outcome = evaluate(succeeded('c1', [singleQuestion()]));
    expect(outcome).toEqual(
      expect.objectContaining({
        kind: 'parsed',
        invalidCount: 0,
        inputTokens: 110,
        outputTokens: 50,
      }),
    );
  });

  it('retries truncated output and invalid JSON', () => {
    expect(evaluate(succeeded('c1', [], 'max_tokens'))).toEqual(
      expect.objectContaining({ kind: 'retry', errorType: 'max_tokens' }),
    );
    const broken = succeeded('c1', []);
    (broken.result as { message: { content: unknown[] } }).message.content = [
      { type: 'text', text: '{oops' },
    ];
    expect(evaluate(broken)).toEqual(
      expect.objectContaining({ kind: 'retry', errorType: 'invalid_json' }),
    );
  });

  it('fails refusals and invalid requests permanently', () => {
    expect(evaluate(succeeded('c1', [], 'refusal')).kind).toBe('failed');
    expect(evaluate(errored('c1', 'invalid_request_error'))).toEqual(
      expect.objectContaining({
        kind: 'failed',
        errorType: 'invalid_request_error',
      }),
    );
  });

  it('retries transient errors and expired requests, fails canceled ones', () => {
    expect(evaluate(errored('c1', 'overloaded_error')).kind).toBe('retry');
    expect(
      evaluate({ custom_id: 'c1', result: { type: 'expired' } }).kind,
    ).toBe('retry');
    expect(
      evaluate({ custom_id: 'c1', result: { type: 'canceled' } }).kind,
    ).toBe('failed');
  });
});
