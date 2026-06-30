export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import db from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  iconUrl: z.string().nullable().optional(),
  qrCodeUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  proofType: z.enum(["NONE", "IMAGE", "TEXT", "IMAGE_AND_TEXT"]).optional(),
  proofLabel: z.string().max(200).nullable().optional(),
  proofImageRequired: z.boolean().optional(),
  requiresTransactionId: z.boolean().optional(),
});

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
    const validated = updateSchema.parse(body);

    const method = await db.paymentMethodDefinition.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ success: true, data: method });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Payment methods PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const { id } = await params;

    const orderCount = await db.order.count({
      where: { paymentMethod: id },
    });

    if (orderCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete: ${orderCount} order(s) reference this payment method`,
          orderCount,
        },
        { status: 409 }
      );
    }

    await db.paymentMethodDefinition.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Payment method deleted" });
  } catch (error) {
    console.error("Payment methods DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
