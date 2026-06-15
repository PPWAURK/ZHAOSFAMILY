import { decryptSecret, encryptSecret, maskSecret } from './ai-config-crypto';

describe('ai-config-crypto', () => {
  const originalSecret = process.env.AUTH_TOKEN_SECRET;

  beforeEach(() => {
    process.env.AUTH_TOKEN_SECRET = 'test-secret-for-ai-config';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_TOKEN_SECRET;
    } else {
      process.env.AUTH_TOKEN_SECRET = originalSecret;
    }
  });

  it('round-trips a secret through encrypt/decrypt', () => {
    const plain = 'sk-or-v1-1234567890abcdef';
    const encrypted = encryptSecret(plain);

    expect(encrypted).not.toContain(plain);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const plain = 'sk-or-v1-1234567890abcdef';

    expect(encryptSecret(plain)).not.toBe(encryptSecret(plain));
  });

  it('returns null when the payload is malformed', () => {
    expect(decryptSecret('not-a-valid-payload')).toBeNull();
    expect(decryptSecret('')).toBeNull();
    expect(decryptSecret('only:two')).toBeNull();
  });

  it('returns null when the auth tag does not match (tampering)', () => {
    const encrypted = encryptSecret('sk-or-v1-1234567890abcdef');
    const [iv, , data] = encrypted.split(':');
    const forgedTag = Buffer.alloc(16).toString('base64');
    const tampered = [iv, forgedTag, data].join(':');

    expect(decryptSecret(tampered)).toBeNull();
  });

  it('cannot decrypt a secret encrypted under a different key', () => {
    const encrypted = encryptSecret('sk-or-v1-1234567890abcdef');
    process.env.AUTH_TOKEN_SECRET = 'a-completely-different-secret';

    expect(decryptSecret(encrypted)).toBeNull();
  });

  it('throws when AUTH_TOKEN_SECRET is missing', () => {
    delete process.env.AUTH_TOKEN_SECRET;

    expect(() => encryptSecret('whatever')).toThrow(
      'AUTH_TOKEN_SECRET_REQUIRED',
    );
  });

  it('masks a secret to its last four characters', () => {
    expect(maskSecret('sk-or-v1-1234abcd')).toBe('••••abcd');
    expect(maskSecret('')).toBe('');
  });
});
