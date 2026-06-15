import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

// Derives a 32-byte AES key from AUTH_TOKEN_SECRET so the stored API key is
// encrypted at rest and can't be read straight out of the database.
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_TOKEN_SECRET;

  if (!secret) {
    throw new Error('AUTH_TOKEN_SECRET_REQUIRED');
  }

  return scryptSync(secret, 'ai-quiz-config', 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(':');

    if (!ivB64 || !tagB64 || !dataB64) {
      return null;
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

// Shows only the last 4 characters so the UI can confirm a key is set without
// ever exposing it.
export function maskSecret(plain: string): string {
  if (!plain) return '';

  const tail = plain.slice(-4);

  return `••••${tail}`;
}
