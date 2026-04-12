/**
 * Pickup Slot ID API — Update or delete a specific slot.
 *
 * PUT    /api/pickup-slots/[id]      — Update a slot (admin only)
 * DELETE /api/pickup-slots/[id]      — Delete a slot (admin only)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const slot = await db.pickupSlot.update({
      where: { id },
      data: {
        maxOrders: body.maxOrders,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ success: true, data: slot });
  } catch (error) {
    console.error("Pickup slot PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update pickup slot" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const { id } = await params;
    await db.pickupSlot.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pickup slot DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete pickup slot" },
      { status: 500 }
    );
  }
}