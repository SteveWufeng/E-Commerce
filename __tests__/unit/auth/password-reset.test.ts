/**
 * Unit tests for lib/auth/password-reset.ts
 */

jest.mock("@/lib/db", () => ({
  db: {
    passwordResetToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2b$12$mockedhash"),
}));

import {
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/auth/password-reset";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const mockCreate = db.passwordResetToken.create as jest.Mock;
const mockDeleteMany = db.passwordResetToken.deleteMany as jest.Mock;
const mockFindUnique = db.passwordResetToken.findUnique as jest.Mock;
const mockTransaction = db.$transaction as jest.Mock;
const mockHash = bcrypt.hash as jest.Mock;

describe("createPasswordResetToken", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a token, stores only its hash, and clears prior unused tokens", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});

    const { token, expiresAt } = await createPasswordResetToken("u1");

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", usedAt: null },
    });

    const stored = mockCreate.mock.calls[0][0].data;
    expect(stored.userId).toBe("u1");
    expect(stored.tokenHash).toBeDefined();
    expect(stored.tokenHash).not.toBe(token);
  });
});

describe("validatePasswordResetToken", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns invalid when no record exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(validatePasswordResetToken("raw")).resolves.toEqual({ error: "invalid" });
  });

  it("returns invalid for an empty token", async () => {
    await expect(validatePasswordResetToken("")).resolves.toEqual({ error: "invalid" });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns used when the token was already consumed", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t1",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
      user: { id: "u1", email: "a@b.com", firstName: "A", lastName: "B" },
    });
    await expect(validatePasswordResetToken("raw")).resolves.toEqual({ error: "used" });
  });

  it("returns expired when past the expiry", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t1",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: "u1", email: "a@b.com", firstName: "A", lastName: "B" },
    });
    await expect(validatePasswordResetToken("raw")).resolves.toEqual({ error: "expired" });
  });

  it("returns the user when the token is valid", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: { id: "u1", email: "a@b.com", firstName: "A", lastName: "B" },
    });
    const result = await validatePasswordResetToken("raw");
    expect(result).toMatchObject({ user: { id: "u1", email: "a@b.com" } });
  });
});

describe("resetPasswordWithToken", () => {
  beforeEach(() => jest.clearAllMocks());

  it("hashes and stores the new password, marks the token used", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: { id: "u1", email: "a@b.com", firstName: "A", lastName: "B" },
    });
    mockTransaction.mockResolvedValue([]);

    const result = await resetPasswordWithToken("raw", "newpassword123");

    expect(result).toMatchObject({ success: true });
    expect(mockHash).toHaveBeenCalledWith("newpassword123", 12);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("does not touch the database for an expired token", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t1",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: "u1", email: "a@b.com", firstName: "A", lastName: "B" },
    });

    const result = await resetPasswordWithToken("raw", "newpassword123");

    expect(result).toEqual({ error: "expired" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
