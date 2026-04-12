/**
 * Order ID API — Update or get a specific order.
 *
 * GET    /api/orders/[id]  — Get single order
 * PUT    /api/orders/[id]  — Update order status (admin only)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "CANCELLED"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;
    
    if (userRole !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateStatusSchema.parse(body);

    const order = await db.order.update({
      where: { id },
      data: { status: validated.status },
      include: { items: true, pickupSlot: true },
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Order PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;
    const isAdmin = userRole === "ADMIN";
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const { id } = await params;

    const where = isAdmin 
      ? { id } 
      : email 
        ? { OR: [{ id }, { orderNumber: id }], customerEmail: email }
        : { OR: [{ id }, { orderNumber: id }], customerEmail: session?.user?.email || "" };

    const order = await db.order.findFirst({
      where,
      include: { items: true, pickupSlot: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Order GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch order" }, { status: 500 });
  }
}