/**
 * Password reset (public).
 *
 * GET  /api/auth/reset-password?token=...  — validate a reset token
 * POST /api/auth/reset-password            — set a new password using a token
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validatePasswordResetToken, resetPasswordWithToken } from "@/lib/auth/password-reset";

const resetSchema = z.object({
  token: z.string().min(1, "Missing token"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const result = await validatePasswordResetToken(token);

  if ("error" in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: { email: result.user.email, firstName: result.user.firstName },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetSchema.parse(body);

    const result = await resetPasswordWithToken(token, password);

    if ("error" in result) {
      const messages: Record<string, string> = {
        invalid: "This reset link is invalid.",
        used: "This reset link has already been used.",
        expired: "This reset link has expired. Please request a new one.",
      };
      return NextResponse.json(
        { success: false, error: messages[result.error] || "Invalid reset link" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: { email: result.user.email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Password reset error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
