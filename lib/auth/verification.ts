import { db } from "@/lib/db";
import crypto from "crypto";

export async function generateVerificationToken(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.verificationToken.create({
    data: {
      identifier: email.toLowerCase(),
      token,
      expires,
    },
  });

  return token;
}

export async function verifyEmail(token: string) {
  const record = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return { error: "Invalid or expired verification link" };
  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { id: record.id } });
    return { error: "Verification link has expired. Please sign up again." };
  }

  const user = await db.user.findUnique({
    where: { email: record.identifier },
  });

  if (!user) {
    await db.verificationToken.delete({ where: { id: record.id } });
    return { error: "User not found" };
  }

  if (user.isVerified) {
    await db.verificationToken.delete({ where: { id: record.id } });
    return { error: "Email is already verified. You can sign in." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });

  await db.verificationToken.delete({ where: { id: record.id } });

  return { success: true };
}
