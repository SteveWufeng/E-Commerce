/**
 * Admin messaging recipients API.
 *
 * Lists Telegram-linked users so staff/admins can start a new discussion with
 * someone who has not messaged the store first.
 *
 * GET /api/admin/messages/recipients?search=&limit=
 *
 * Accessible to ADMIN and STAFF.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json({ success: false, error: "Admin or staff required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "100") || 100, 200);

    const where: Record<string, unknown> = {
      telegramChatId: { not: null },
      telegramOptIn: true,
    };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await db.user.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        telegramOptIn: true,
      },
    });

    const data = users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      telegramReachable: user.telegramOptIn,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Admin message recipients GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load recipients" },
      { status: 500 }
    );
  }
}
