import type { MessageBatchIndividualResponse } from '@anthropic-ai/sdk/resources/messages';

const opt = (key: string) => ({ key, zh: `选项${key}`, fr: `Option ${key}` });

export function singleQuestion(promptZh = '洗手需要多久?') {
  return {
    type: 'single',
    difficulty: 'recall',
    categoryCode: 'other',
    knowledgePoint: '洗手时长',
    prompt: { zh: promptZh, fr: 'Combien de temps ?' },
    options: ['A', 'B', 'C', 'D'].map(opt),
    correctKeys: ['B'],
    explanation: { zh: '至少20秒。', fr: 'Au moins 20 secondes.' },
    evidence: '至少20秒',
  };
}

export function succeeded(
  customId: string,
  questions: unknown[],
  stopReason = 'end_turn',
): MessageBatchIndividualResponse {
  return {
    custom_id: customId,
    result: {
      type: 'succeeded',
      message: {
        stop_reason: stopReason,
        content: [
          { type: 'thinking', thinking: '', signature: 's' },
          { type: 'text', text: JSON.stringify({ questions }) },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 10,
        },
      },
    },
  } as unknown as MessageBatchIndividualResponse;
}

export function errored(
  customId: string,
  type: string,
): MessageBatchIndividualResponse {
  return {
    custom_id: customId,
    result: {
      type: 'errored',
      error: { type: 'error', error: { type, message: 'x' }, request_id: null },
    },
  } as unknown as MessageBatchIndividualResponse;
}
