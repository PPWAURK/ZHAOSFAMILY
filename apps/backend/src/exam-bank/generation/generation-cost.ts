import type { GenerationPlan, PlannerChunk } from './generation-planner';
import { mixTotal } from './generation-planner';

/** Message Batches prices (50% of standard), USD per million tokens. */
export const BATCH_PRICING_PER_MTOK: Readonly<
  Record<string, { input: number; output: number }>
> = {
  'claude-opus-5-5': { input: 2, output: 10 },
  'claude-sonnet-5-5': { input: 1, output: 5 },
  'claude-haiku-5-5': { input: 0.05, output: 0.25 },
};

const PROMPT_OVERHEAD_TOKENS = 1500;
const RELATED_CONTEXT_TOKENS = 1200;
const THINKING_TOKENS_PER_REQUEST = 2500;
const OUTPUT_TOKENS_PER_QUESTION = 450;

export function estimateGenerationCost(
  plan: Pick<GenerationPlan, 'requests'>,
  chunks: readonly PlannerChunk[],
  model: string,
) {
  const chunkTokens = new Map(chunks.map((c) => [c.id, c.tokenEstimate]));
  const estimatedInputTokens = plan.requests.reduce(
    (sum, r) =>
      sum +
      PROMPT_OVERHEAD_TOKENS +
      RELATED_CONTEXT_TOKENS +
      (chunkTokens.get(r.chunkId) ?? 0),
    0,
  );
  const estimatedOutputTokens = plan.requests.reduce(
    (sum, r) =>
      sum +
      THINKING_TOKENS_PER_REQUEST +
      OUTPUT_TOKENS_PER_QUESTION * mixTotal(r.quota),
    0,
  );
  const price = BATCH_PRICING_PER_MTOK[model];
  const estimatedCostUsd = price
    ? Math.round(
        ((estimatedInputTokens * price.input +
          estimatedOutputTokens * price.output) /
          1e6) *
          100,
      ) / 100
    : null;
  return { estimatedInputTokens, estimatedOutputTokens, estimatedCostUsd };
}
