/**
 * Receipt upload API — customer uploads bank transfer receipt.
 *
 * POST /api/orders/[id]/receipt  — Upload receipt image for an order
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { receiptImage } = body;

    if (!receiptImage || typeof receiptImage !== "string") {
      return NextResponse.json(
        { success: false, error: "Receipt image URL is required" },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({ where: { id } });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.paymentMethod !== "BANK_TRANSFER") {
      return NextResponse.json(
        { success: false, error: "Receipt upload is only for bank transfer orders" },
        { status: 400 }
      );
    }

    // Allow re-upload if order was rejected
    const newStatus = order.status === "REJECTED" ? "CONFIRMED" : "CONFIRMED";

    const updated = await db.order.update({
      where: { id },
      data: {
        receiptImage,
        paymentStatus: "COMPLETED",
        status: newStatus,
        rejectionReason: null, // Clear rejection reason on re-upload
      },
      include: { items: true },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Receipt uploaded. Your order is now pending admin confirmation.",
    });
  } catch (error) {
    console.error("Receipt upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload receipt" },
      { status: 500 }
    );
  }
}
