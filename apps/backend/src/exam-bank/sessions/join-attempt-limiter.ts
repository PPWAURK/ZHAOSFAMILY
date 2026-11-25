import { HttpException, HttpStatus } from '@nestjs/common';

export const MAX_FAILED_JOINS = 10;
export const FAILED_JOIN_WINDOW_MS = 10 * 60_000;

/**
 * Per-user brake against guessing join codes. Counted per user rather than
 * per IP because a whole store shares one IP and joins at the same moment.
 * In-memory: fine for the single-instance deployment.
 */
export class JoinAttemptLimiter {
  private readonly failures = new Map<number, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  assertAllowed(userId: number): void {
    if (this.recent(userId).length >= MAX_FAILED_JOINS) {
      throw new HttpException(
        'EXAM_SESSION_TOO_MANY_TRIES',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(userId: number): void {
    this.failures.set(userId, [...this.recent(userId), this.now()]);
  }

  reset(userId: number): void {
    this.failures.delete(userId);
  }

  private recent(userId: number): number[] {
    const cutoff = this.now() - FAILED_JOIN_WINDOW_MS;
    return (this.failures.get(userId) ?? []).filter((at) => at > cutoff);
  }
}
