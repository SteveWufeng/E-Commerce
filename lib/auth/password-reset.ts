/**
 * Password reset token utilities.
 *
 * Admin-generated reset links: the raw token is sent to the user (via a copied
 * link or email), while only a SHA-256 hash is persisted. Tokens expire and are
 * single-use.
 */

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const PASSWORD_RESET_TTL_MINUTES = 60;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Create a fresh single-use reset token for a user.
 * Invalidates any previously issued, unused tokens for that user.
 */
export async function createPasswordResetToken(userId: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  await db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });

  await db.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { token: rawToken, expiresAt };
}

export type PasswordResetValidation =
  | { error: "invalid" | "used" | "expired" }
  | {
      record: { id: string };
      user: { id: string; email: string; firstName: string; lastName: string };
    };

/**
 * Validate a raw reset token without consuming it.
 */
export async function validatePasswordResetToken(
  rawToken: string
): Promise<PasswordResetValidation> {
  if (!rawToken) return { error: "invalid" };

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  if (!record) return { error: "invalid" };
  if (record.usedAt) return { error: "used" };
  if (record.expiresAt < new Date()) return { error: "expired" };

  return { record: { id: record.id }, user: record.user };
}

/**
 * Consume a reset token and set a new password for the associated user.
 * Also marks the account as verified (the user proved email/ownership).
 */
export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  const validation = await validatePasswordResetToken(rawToken);
  if ("error" in validation) return validation;

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.$transaction([
    db.user.update({
      where: { id: validation.user.id },
      data: { passwordHash, isVerified: true },
    }),
    db.passwordResetToken.update({
      where: { id: validation.record.id },
      data: { usedAt: new Date() },
    }),
    db.passwordResetToken.deleteMany({
      where: { userId: validation.user.id, usedAt: null },
    }),
  ]);

  return { success: true as const, user: validation.user };
}
