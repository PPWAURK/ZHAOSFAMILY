import { ROW_LOCK_MS } from '../exam-bank.constants';

type LockableDelegate = {
  updateMany(args: {
    where: Record<string, unknown>;
    data: { lockedUntil: Date | null };
  }): Promise<{ count: number }>;
};

/**
 * Claims a row for background work by moving its lockedUntil into the future,
 * only when no other worker holds an unexpired lock. Returns true when this
 * caller won the row.
 */
export async function claimRow(
  delegate: LockableDelegate,
  id: number,
  now: Date = new Date(),
  durationMs: number = ROW_LOCK_MS,
): Promise<boolean> {
  const result = await delegate.updateMany({
    where: {
      id,
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: { lockedUntil: new Date(now.getTime() + durationMs) },
  });
  return result.count === 1;
}

export async function releaseRow(
  delegate: LockableDelegate,
  id: number,
): Promise<void> {
  await delegate.updateMany({ where: { id }, data: { lockedUntil: null } });
}
