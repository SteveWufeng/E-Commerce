/**
 * Receipt upload API — customer uploads bank transfer receipt.
 *
 * POST /api/orders/[id]/receipt  — Upload receipt image for an order
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

async function deleteFromR2(url: string) {
  if (!R2_PUBLIC_URL || !url.startsWith(R2_PUBLIC_URL)) return;
  const key = url.replace(R2_PUBLIC_URL, "").replace(/^\//, "");
  if (!key) return;
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
}

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

    // Require authentication and ownership
    const session = await auth();
    const userEmail = session?.user?.email;
    if (!userEmail || userEmail !== order.customerEmail) {
      return NextResponse.json(
        { success: false, error: "Only the order owner can upload a receipt" },
        { status: 403 }
      );
    }

    if (order.paymentMethod !== "BANK_TRANSFER") {
      return NextResponse.json(
        { success: false, error: "Receipt upload is only for bank transfer orders" },
        { status: 400 }
      );
    }

    // Delete old receipt from R2 if it exists
    if (order.receiptImage) {
      await deleteFromR2(order.receiptImage).catch(() => {});
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        receiptImage,
        paymentStatus: "COMPLETED",
        status: "CONFIRMED",
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
