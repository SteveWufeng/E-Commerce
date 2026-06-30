/**
 * Stock Adjustment API — Quick stock adjustments for barcode scanning.
 *
 * PUT /api/products/[id]/stock
 *   Body: { adjustment: 5 }   // positive to add, negative to remove
 *   Response: { success: true, data: { id, name, stock, barcode } }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";

const stockSchema = z.object({
  adjustment: z.number().int().min(-999999).max(999999),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { adjustment } = stockSchema.parse(body);

    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const newStock = Math.max(0, product.stock + adjustment);

    const updated = await db.product.update({
      where: { id },
      data: { stock: newStock },
      select: { id: true, name: true, slug: true, stock: true, barcode: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Stock adjustment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
