import crypto from 'crypto';

let ephemeralFallbackKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  const envKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (envKey && envKey.trim().length > 0) {
    return crypto.createHash('sha256').update(envKey.trim()).digest();
  }
  if (!ephemeralFallbackKey) {
    ephemeralFallbackKey = crypto.randomBytes(32);
  }
  return ephemeralFallbackKey;
}

/**
 * Encrypts sensitive tenant integration credentials using AES-256-GCM.
 */
export function encryptCredentials(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts AES-256-GCM encrypted credentials stored in tenant_integrations.
 */
export function decryptCredentials(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credential format.');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
