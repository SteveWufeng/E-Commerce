/**
 * Pickup Slots API — Manage available pickup time slots.
 *
 * GET    /api/pickup-slots           — List available slots (public)
 * POST   /api/pickup-slots           — Create a slot (admin only)
 * PUT    /api/pickup-slots/[id]      — Update a slot (admin only)
 * DELETE /api/pickup-slots/[id]      — Delete a slot (admin only)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type PickupSlotRecord = {
  isActive: boolean;
  currentOrders: number;
  maxOrders: number;
} & Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const available = searchParams.get("available") === "true";
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");

    const where: Record<string, unknown> = {};

    if (available) {
      where.isActive = true;
      where.currentOrders = { lt: db.pickupSlot.fields.maxOrders };
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
    }

    const slots: PickupSlotRecord[] = await db.pickupSlot.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // Add computed isAvailable field
    const slotsWithAvailability = slots.map((slot: PickupSlotRecord) => ({
      ...slot,
      isAvailable: slot.isActive && slot.currentOrders < slot.maxOrders,
    }));

    return NextResponse.json({
      success: true,
      data: slotsWithAvailability,
    });
  } catch (error) {
    console.error("Pickup slots API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pickup slots" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin auth check
    const body = await request.json();

    const slot = await db.pickupSlot.create({
      data: {
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        maxOrders: body.maxOrders || 10,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: slot }, { status: 201 });
  } catch (error) {
    console.error("Pickup slots API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create pickup slot" },
      { status: 500 }
    );
  }
}
