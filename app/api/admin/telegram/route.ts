/**
 * Admin Telegram configuration API.
 *
 * GET  /api/admin/telegram     — Get current config (token always masked)
 * POST /api/admin/telegram     — Save config (botToken encrypted at rest)
 *
 * Access restricted to ADMIN role.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getTelegramConfig, saveTelegramConfig } from "@/lib/telegram";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const config = await getTelegramConfig();
    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled,
        botUsername: config.botUsername,
        hasBotToken: Boolean(config.botToken),
      },
    });
  } catch (error) {
    console.error("Admin Telegram GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const body = await request.json();
    const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;
    const botUsername = typeof body.botUsername === "string" ? body.botUsername : undefined;
    const botToken = typeof body.botToken === "string" ? body.botToken : undefined;

    await saveTelegramConfig({ enabled, botUsername, botToken });

    const config = await getTelegramConfig();
    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled,
        botUsername: config.botUsername,
        hasBotToken: Boolean(config.botToken),
      },
    });
  } catch (error) {
    console.error("Admin Telegram POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to save config" }, { status: 500 });
  }
}
