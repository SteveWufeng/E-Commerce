/**
 * Admin users API — update a single user.
 *
 * PATCH /api/admin/users/[id]
 *   Updates a user's role, profile fields, verification state and Telegram
 *   binding. ADMIN only — staff cannot update users or roles.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(40).nullable().optional(),
  isVerified: z.boolean().optional(),
  telegramChatId: z.string().max(64).nullable().optional(),
  telegramOptIn: z.boolean().optional(),
});

const userSelect = {
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
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const currentUserId = (admin.user as { id?: string })?.id;
    const { id } = await params;
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (validated.firstName !== undefined) data.firstName = validated.firstName;
    if (validated.lastName !== undefined) data.lastName = validated.lastName;
    if (validated.phone !== undefined) data.phone = validated.phone?.trim() || null;
    if (validated.isVerified !== undefined) data.isVerified = validated.isVerified;

    if (validated.role !== undefined && validated.role !== target.role) {
      if (target.id === currentUserId) {
        return NextResponse.json(
          { success: false, error: "You cannot change your own role" },
          { status: 400 }
        );
      }
      if (target.role === "ADMIN") {
        const adminCount = await db.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, error: "Cannot demote the last admin" },
            { status: 400 }
          );
        }
      }
      data.role = validated.role;
    }

    if (validated.telegramChatId !== undefined) {
      const chatId = validated.telegramChatId?.trim() || null;
      if (chatId) {
        const linked = await db.user.findFirst({
          where: { telegramChatId: chatId, NOT: { id } },
          select: { id: true },
        });
        if (linked) {
          return NextResponse.json(
            { success: false, error: "That Telegram chat is already linked to another user" },
            { status: 409 }
          );
        }
      }
      data.telegramChatId = chatId;
      data.telegramOptIn = chatId === null ? false : validated.telegramOptIn ?? true;
    } else if (validated.telegramOptIn !== undefined) {
      data.telegramOptIn = validated.telegramOptIn;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Admin users PATCH error:", error);
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
