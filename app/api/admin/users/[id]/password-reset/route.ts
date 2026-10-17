/**
 * Admin password reset link generation.
 *
 * POST /api/admin/users/[id]/password-reset
 *   Body: { sendEmail?: boolean }
 *   Generates a single-use password reset link for the user. ADMIN only.
 *   Returns the link so an admin can copy it, and optionally emails it.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { createPasswordResetToken, PASSWORD_RESET_TTL_MINUTES } from "@/lib/auth/password-reset";
import { sendEmail, passwordResetEmail } from "@/lib/email";

function baseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(request.url).origin
  ).replace(/\/$/, "");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const sendEmailFlag = body?.sendEmail === true;

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { token, expiresAt } = await createPasswordResetToken(user.id);
    const url = `${baseUrl(request)}/reset-password?token=${token}`;

    let emailSent = false;
    if (sendEmailFlag) {
      emailSent = await sendEmail(
        passwordResetEmail({
          email: user.email,
          resetUrl: url,
          appName: process.env.NEXT_PUBLIC_STORE_NAME || process.env.NEXT_PUBLIC_APP_NAME || "Store",
          expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        })
      );
    }

    return NextResponse.json({
      success: true,
      data: { url, expiresAt, emailSent, email: user.email },
    });
  } catch (error) {
    console.error("Admin password-reset error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create reset link" },
      { status: 500 }
    );
  }
}
