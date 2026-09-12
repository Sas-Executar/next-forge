import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { keys } from "../keys";

/**
 * Encryption-at-rest for OAuth access/refresh tokens
 * (IntegrationConnection.accessTokenEncrypted/refreshTokenEncrypted,
 * M11-T01..T04). No shared crypto helper exists elsewhere in this repo
 * (packages/security wraps Arcjet bot/rate-limit protection, not
 * encryption) — this is a small, disclosed, code-owned addition rather
 * than a Blueprint-sourced contract.
 *
 * AES-256-GCM via Node's built-in node:crypto: a 12-byte random IV per
 * encryption call, the GCM auth tag appended to the ciphertext, both
 * base64-encoded together as `${iv}:${ciphertext+tag}` so decrypt has
 * everything it needs from the one stored string.
 */
export class EncryptionKeyMissingError extends Error {
  constructor() {
    super(
      "INTEGRATIONS_ENCRYPTION_KEY is not set — refusing to encrypt or decrypt an integration credential rather than falling back to plaintext."
    );
    this.name = "EncryptionKeyMissingError";
  }
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

const resolveKey = (): Buffer => {
  const raw = keys().INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) {
    throw new EncryptionKeyMissingError();
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `INTEGRATIONS_ENCRYPTION_KEY must decode (base64) to exactly 32 bytes for AES-256-GCM — got ${key.length}.`
    );
  }
  return key;
};

export const encryptToken = (plaintext: string): string => {
  const key = resolveKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${Buffer.concat([ciphertext, authTag]).toString("base64")}`;
};

export const decryptToken = (stored: string): string => {
  const key = resolveKey();
  const [ivPart, payloadPart] = stored.split(":");
  if (!(ivPart && payloadPart)) {
    throw new Error(
      "Stored token is not in the expected `iv:ciphertext` format."
    );
  }
  const iv = Buffer.from(ivPart, "base64");
  const payload = Buffer.from(payloadPart, "base64");
  const authTag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
};
