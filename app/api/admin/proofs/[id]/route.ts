export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import db from "@/lib/db";
import { z } from "zod";

const verifySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().optional(),
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
    const validated = verifySchema.parse(body);

    if (validated.status === "REJECTED" && !validated.rejectionReason) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const proof = await db.paymentProof.findUnique({ where: { id } });
    if (!proof) {
      return NextResponse.json({ success: false, error: "Proof not found" }, { status: 404 });
    }

    const userId = (admin.user as { id: string }).id;

    const updated = await db.paymentProof.update({
      where: { id },
      data: {
        status: validated.status,
        verifiedById: userId,
        rejectionReason: validated.status === "REJECTED" ? validated.rejectionReason || null : null,
      },
      include: { paymentMethodDefinition: true },
    });

    if (validated.status === "VERIFIED") {
      await db.order.update({
        where: { id: proof.orderId },
        data: { paymentStatus: "COMPLETED" },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Proof verify error:", error);
    return NextResponse.json({ success: false, error: "Failed to verify proof" }, { status: 500 });
  }
}
