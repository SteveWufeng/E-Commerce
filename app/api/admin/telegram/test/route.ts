/**
 * Test Telegram connection API.
 *
 * POST /api/admin/telegram/test — Pings the Telegram getMe endpoint to verify
 *                                 the bot token works before saving.
 *
 * Accepts an optional botToken in the body (token being tested). If omitted,
 * uses the currently stored token.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getTelegramConfig, testTelegramConnection } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let token = typeof body.botToken === "string" ? body.botToken : null;

    if (!token) {
      const config = await getTelegramConfig();
      token = config.botToken;
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No bot token configured" },
        { status: 400 }
      );
    }

    const result = await testTelegramConnection(token);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || "Connection failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { botUsername: result.botUsername },
    });
  } catch (error) {
    console.error("Admin Telegram test error:", error);
    return NextResponse.json({ success: false, error: "Test failed" }, { status: 500 });
  }
}
