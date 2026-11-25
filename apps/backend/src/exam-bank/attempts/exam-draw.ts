import type { QuestionOption } from '../exam-bank.types';

export type Random = () => number;

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(
  items: readonly T[],
  random: Random = Math.random,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sample<T>(
  items: readonly T[],
  count: number,
  random: Random = Math.random,
): T[] {
  return shuffle(items, random).slice(0, count);
}

/** Shuffles choice options but keeps true/false in a stable order. Keys never change. */
export function arrangeOptions(
  type: string,
  options: readonly QuestionOption[],
  shouldShuffle: boolean,
  random: Random = Math.random,
): QuestionOption[] {
  if (type === 'boolean') {
    return [...options].sort((a, b) =>
      a.key === 'true' ? -1 : b.key === 'true' ? 1 : 0,
    );
  }
  return shouldShuffle ? shuffle(options, random) : [...options];
}
