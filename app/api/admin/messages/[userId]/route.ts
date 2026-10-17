/**
 * Admin message inbox — single conversation thread.
 *
 * GET  /api/admin/messages/[userId]
 *   Returns the full thread for a customer and marks their messages as read.
 * POST /api/admin/messages/[userId]
 *   Sends an admin reply: persists it and delivers it to the customer's
 *   Telegram. Admin or staff only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { sendTelegramToUser, buildAdminReplyMessage } from "@/lib/telegram";
import { z } from "zod";

const replySchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json({ success: false, error: "Admin or staff required" }, { status: 401 });
    }

    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        telegramChatId: true,
        telegramOptIn: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const messages = await db.message.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // Mark the customer's messages as read.
    await db.message.updateMany({
      where: { userId, sender: "CUSTOMER", readByAdmin: false },
      data: { readByAdmin: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          telegramReachable: Boolean(user.telegramChatId && user.telegramOptIn),
        },
        messages,
      },
    });
  } catch (error) {
    console.error("Admin messages thread GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load thread" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json({ success: false, error: "Admin or staff required" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();
    const validated = replySchema.parse(body);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, telegramChatId: true, telegramOptIn: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const message = await db.message.create({
      data: {
        userId,
        sender: "ADMIN",
        body: validated.body,
        readByAdmin: true,
        readByUser: false,
      },
    });

    const adminName =
      (staff.user as { name?: string })?.name ||
      (staff.user as { email?: string })?.email ||
      "Store team";

    const delivered = await sendTelegramToUser(
      userId,
      buildAdminReplyMessage(adminName, validated.body)
    );

    return NextResponse.json({ success: true, data: { message, delivered } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Admin messages thread POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to send reply" }, { status: 500 });
  }
}
