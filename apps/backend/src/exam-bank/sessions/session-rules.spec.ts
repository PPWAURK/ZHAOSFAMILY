import { HttpException } from '@nestjs/common';
import { computeDeadline } from '../attempts/exam-attempt-starter.service';
import { JoinAttemptLimiter, MAX_FAILED_JOINS } from './join-attempt-limiter';
import { generateSessionCode, isSessionCode } from './session-code';

describe('session codes', () => {
  it('generates 6-digit, zero-padded codes', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(isSessionCode(generateSessionCode())).toBe(true);
    }
    expect(isSessionCode('12345')).toBe(false);
    expect(isSessionCode('12a456')).toBe(false);
  });
});

describe('computeDeadline', () => {
  const now = new Date('2026-11-23T10:00:00Z');

  it('uses the personal time limit when the session has no end', () => {
    expect(computeDeadline(now, 30, null)).toEqual(
      new Date('2026-11-23T10:30:00Z'),
    );
  });

  it('never runs past the session end (late arrivals get less time)', () => {
    expect(computeDeadline(now, 30, new Date('2026-11-23T10:10:00Z'))).toEqual(
      new Date('2026-11-23T10:10:00Z'),
    );
  });

  it('falls back to the session end for untimed papers, or none at all', () => {
    const end = new Date('2026-11-23T11:00:00Z');
    expect(computeDeadline(now, null, end)).toEqual(end);
    expect(computeDeadline(now, null, null)).toBeNull();
  });
});

describe('JoinAttemptLimiter', () => {
  it('blocks a user after repeated wrong codes, per user, within the window', () => {
    let clock = 0;
    const limiter = new JoinAttemptLimiter(() => clock);
    for (let i = 0; i < MAX_FAILED_JOINS; i += 1) limiter.recordFailure(1);

    expect(() => limiter.assertAllowed(1)).toThrow(HttpException);
    expect(() => limiter.assertAllowed(2)).not.toThrow();

    clock = 11 * 60_000;
    expect(() => limiter.assertAllowed(1)).not.toThrow();
  });

  it('forgets failures after a successful lookup', () => {
    const limiter = new JoinAttemptLimiter(() => 0);
    for (let i = 0; i < MAX_FAILED_JOINS; i += 1) limiter.recordFailure(1);
    limiter.reset(1);
    expect(() => limiter.assertAllowed(1)).not.toThrow();
  });
});
