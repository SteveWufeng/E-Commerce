/**
 * Unit tests for Telegram encryption utilities.
 */

import { encryptSecret, decryptSecret } from "@/lib/telegram/encryption";

describe("Telegram encryption", () => {
  const originalKey = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "unit-test-secret-key-for-telegram";
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.NEXTAUTH_SECRET;
    } else {
      process.env.NEXTAUTH_SECRET = originalKey;
    }
  });

  it("encrypts and decrypts a token", () => {
    const token = "123456789:AAFakeBotTokenForTesting";
    const encrypted = encryptSecret(token);

    expect(encrypted).not.toBe(token);
    expect(encrypted.split(":")).toHaveLength(3);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const token = "same-token";
    const a = encryptSecret(token);
    const b = encryptSecret(token);

    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(token);
    expect(decryptSecret(b)).toBe(token);
  });

  it("throws on tampered payload", () => {
    const token = "tamper-me";
    const encrypted = encryptSecret(token);
    const parts = encrypted.split(":");
    const tampered = [parts[0], parts[1], "AAAA"].join(":");

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws when no encryption key is available", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => encryptSecret("token")).toThrow();
  });
});
