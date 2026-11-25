import { randomInt } from 'crypto';
import { SESSION_CODE_LENGTH } from '../exam-bank.constants';

/** Cryptographically random, zero-padded numeric join code, e.g. "048213". */
export function generateSessionCode(): string {
  return String(randomInt(0, 10 ** SESSION_CODE_LENGTH)).padStart(
    SESSION_CODE_LENGTH,
    '0',
  );
}

export function isSessionCode(value: string): boolean {
  return new RegExp(`^\\d{${SESSION_CODE_LENGTH}}$`).test(value);
}
