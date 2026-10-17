/**
 * Admin notification history API.
 *
 * Every message broadcast to admins over Telegram is also retained here so
 * staff/admins can read it in the dashboard even when not on Telegram.
 *
 * GET  /api/admin/notifications  — list notifications + unread count
 * POST /api/admin/notifications  — mark notifications as read
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "100") || 100, 200);
    const unreadOnly = searchParams.get("unreadOnly") === "1";
    const sinceParam = searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : null;

    const where: Record<string, unknown> = {};
    if (unreadOnly) where.read = false;
    if (since && !Number.isNaN(since.getTime())) {
      where.createdAt = { gt: since };
    }

    const [notifications, unreadCount] = await Promise.all([
      db.adminNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.adminNotification.count({ where: { read: false } }),
    ]);

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error("Admin notifications GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json({ success: false, error: "Admin or staff required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : null;

    if (body?.all === true) {
      await db.adminNotification.updateMany({ where: { read: false }, data: { read: true } });
    } else if (ids && ids.length > 0) {
      await db.adminNotification.updateMany({ where: { id: { in: ids } }, data: { read: true } });
    }

    const unreadCount = await db.adminNotification.count({ where: { read: false } });
    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Admin notifications POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
