export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import db from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  iconUrl: z.string().optional(),
  qrCodeUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  proofType: z.enum(["NONE", "IMAGE", "TEXT", "IMAGE_AND_TEXT"]).optional(),
  proofLabel: z.string().max(200).optional(),
  proofImageRequired: z.boolean().optional(),
  requiresTransactionId: z.boolean().optional(),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const methods = await db.paymentMethodDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ success: true, data: methods });
  } catch (error) {
    console.error("Payment methods GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createSchema.parse(body);

    const method = await db.paymentMethodDefinition.create({
      data: {
        name: validated.name,
        description: validated.description,
        iconUrl: validated.iconUrl || null,
        qrCodeUrl: validated.qrCodeUrl || null,
        isActive: validated.isActive ?? true,
        sortOrder: validated.sortOrder ?? 0,
        proofType: validated.proofType ?? "IMAGE",
        proofLabel: validated.proofLabel || null,
        proofImageRequired: validated.proofImageRequired ?? false,
        requiresTransactionId: validated.requiresTransactionId ?? false,
      },
    });

    return NextResponse.json({ success: true, data: method }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Payment methods POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}
