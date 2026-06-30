export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import db from "@/lib/db";
import { z } from "zod";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "ecommerce";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

async function deleteR2File(url: string | null | undefined) {
  if (!url || !url.startsWith(PUBLIC_URL)) return;
  const key = url.replace(PUBLIC_URL + "/", "");
  if (!key) return;
  try {
    await R2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // Non-critical
  }
}

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

    if (validated.iconUrl !== undefined || validated.qrCodeUrl !== undefined) {
      const existing = await db.paymentMethodDefinition.findUnique({
        where: { id },
        select: { iconUrl: true, qrCodeUrl: true },
      });
      if (existing) {
        await Promise.all([
          validated.iconUrl !== undefined && deleteR2File(existing.iconUrl),
          validated.qrCodeUrl !== undefined && deleteR2File(existing.qrCodeUrl),
        ]);
      }
    }

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

    const method = await db.paymentMethodDefinition.findUnique({
      where: { id },
      select: { iconUrl: true, qrCodeUrl: true },
    });

    await db.paymentMethodDefinition.delete({ where: { id } });

    if (method) {
      await Promise.all([deleteR2File(method.iconUrl), deleteR2File(method.qrCodeUrl)]);
    }

    return NextResponse.json({ success: true, message: "Payment method deleted" });
  } catch (error) {
    console.error("Payment methods DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
