/**
 * Telegram account linking API.
 *
 * POST /api/telegram/link    — Generate a single-use deep link for the
 *                              authenticated user to connect their Telegram
 * POST /api/telegram/unlink  — Disconnect the user's Telegram account
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTelegramLinkToken } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    if (body.action === "unlink") {
      await db.user.update({
        where: { id: userId },
        data: { telegramChatId: null, telegramOptIn: false },
      });
      return NextResponse.json({ success: true, data: { linked: false } });
    }

    const link = await createTelegramLinkToken(userId);
    if (!link.deepLink) {
      return NextResponse.json(
        { success: false, error: "Telegram bot not configured. Ask the store to enable it." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        deepLink: link.deepLink,
        expiresAt: link.expiresAt,
      },
    });
  } catch (error) {
    console.error("Telegram link error:", error);
    return NextResponse.json({ success: false, error: "Failed to create link" }, { status: 500 });
  }
}
