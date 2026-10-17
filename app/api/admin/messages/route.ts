/**
 * Admin message inbox — conversation list.
 *
 * GET /api/admin/messages
 *   Returns one entry per customer who has exchanged messages, with the latest
 *   message preview and an unread count. ADMIN only.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";

export async function GET() {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json({ success: false, error: "Admin or staff required" }, { status: 401 });
    }

    const messages = await db.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    interface Conversation {
      userId: string;
      name: string;
      email: string;
      lastMessage: string;
      lastAt: Date;
      unread: number;
    }

    const map = new Map<string, Conversation>();
    for (const message of messages) {
      let convo = map.get(message.userId);
      if (!convo) {
        const name =
          [message.user.firstName, message.user.lastName].filter(Boolean).join(" ") ||
          message.user.email;
        convo = {
          userId: message.userId,
          name,
          email: message.user.email,
          lastMessage: message.body,
          lastAt: message.createdAt,
          unread: 0,
        };
        map.set(message.userId, convo);
      }
      if (message.sender === "CUSTOMER" && !message.readByAdmin) {
        convo.unread += 1;
      }
    }

    const conversations = Array.from(map.values()).sort(
      (a, b) => b.lastAt.getTime() - a.lastAt.getTime()
    );

    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error("Admin messages GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load conversations" }, { status: 500 });
  }
}
