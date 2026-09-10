import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptToken,
  EncryptionKeyMissingError,
  encryptToken,
} from "../src/crypto";

describe("encryptToken / decryptToken", () => {
  const originalKey = process.env.INTEGRATIONS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY =
      randomBytes(32).toString("base64");
  });

  afterEach(() => {
    if (originalKey === undefined) {
      // biome-ignore lint/performance/noDelete: assignment coerces to the string "undefined" — delete is the only way to actually unset a process.env var.
      delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    } else {
      process.env.INTEGRATIONS_ENCRYPTION_KEY = originalKey;
    }
  });

  it("round-trips a plaintext token", () => {
    const plaintext = "ya29.a0AfH6SMC-example-access-token";
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const plaintext = "same-plaintext";
    expect(encryptToken(plaintext)).not.toBe(encryptToken(plaintext));
  });

  it("throws EncryptionKeyMissingError rather than storing plaintext when unset", () => {
    // biome-ignore lint/performance/noDelete: assignment coerces to the string "undefined" — delete is the only way to actually unset a process.env var.
    delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    expect(() => encryptToken("anything")).toThrow(EncryptionKeyMissingError);
  });
});
