/**
 * Admin users API — list all users.
 *
 * GET /api/admin/users
 *   Returns users with role, verification and Telegram-link state.
 *   ADMIN only — staff cannot view users.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const ROLES = ["CUSTOMER", "STAFF", "ADMIN"];

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const role = searchParams.get("role");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100") || 100, 200);

    const where: Record<string, unknown> = {};
    if (role && ROLES.includes(role)) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        telegramChatId: true,
        telegramOptIn: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load users" }, { status: 500 });
  }
}
