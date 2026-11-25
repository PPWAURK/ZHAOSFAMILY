/**
 * Splits `total` into integers proportional to `weights` (largest remainder
 * method), never exceeding the optional per-slot `caps`. When the caps cannot
 * absorb the whole total, the result sums to the total capacity instead.
 */
export function largestRemainder(
  weights: readonly number[],
  total: number,
  caps?: readonly number[],
): number[] {
  const capOf = (i: number) => caps?.[i] ?? Number.POSITIVE_INFINITY;
  const result = weights.map(() => 0);
  let remaining = Math.max(0, Math.floor(total));

  while (remaining > 0) {
    const open = weights
      .map((weight, i) => ({ weight: Math.max(0, weight), i }))
      .filter(({ i }) => result[i] < capOf(i));
    if (!open.length) break;
    const weightSum = open.reduce((sum, slot) => sum + slot.weight, 0);
    const shares = open.map(({ weight, i }) => {
      const raw =
        weightSum > 0
          ? (weight / weightSum) * remaining
          : remaining / open.length;
      const room = capOf(i) - result[i];
      return {
        i,
        whole: Math.min(Math.floor(raw), room),
        fraction: raw - Math.floor(raw),
      };
    });
    let given = 0;
    for (const share of shares) {
      result[share.i] += share.whole;
      given += share.whole;
    }
    remaining -= given;
    const byFraction = [...shares].sort(
      (a, b) => b.fraction - a.fraction || a.i - b.i,
    );
    for (const share of byFraction) {
      if (remaining === 0) break;
      if (result[share.i] < capOf(share.i)) {
        result[share.i] += 1;
        remaining -= 1;
        given += 1;
      }
    }
    if (given === 0) break;
  }
  return result;
}
