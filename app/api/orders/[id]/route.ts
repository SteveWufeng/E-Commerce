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
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { sendEmail, orderConfirmationEmail, orderReadyEmail } from "@/lib/email";

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

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "CANCELLED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;
    const userEmail = session?.user?.email;

    const { id } = await params;
    const body = await request.json();
    const validated = updateStatusSchema.parse(body);

    // Admin can do any status change
    if (userRole === "ADMIN") {
      const updateData: Record<string, unknown> = { status: validated.status };

      if (validated.status === "REJECTED") {
        if (!validated.rejectionReason) {
          return NextResponse.json(
            { success: false, error: "Rejection reason is required" },
            { status: 400 }
          );
        }
        updateData.rejectionReason = validated.rejectionReason;

        // Delete the old receipt image from R2
        const existing = await db.order.findUnique({ where: { id }, select: { receiptImage: true } });
        if (existing?.receiptImage) {
          await deleteFromR2(existing.receiptImage).catch(() => {});
        }
      }

      if (validated.status === "CONFIRMED") {
        updateData.rejectionReason = null;
      }

      const order = await db.order.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });

      // Send email notifications on status changes
      if (validated.status === "CONFIRMED" && order.customerEmail) {
        const emailTpl = orderConfirmationEmail({
          customerName: order.customerFirstName,
          orderNumber: order.orderNumber,
          items: order.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: `$${Number(item.productPrice).toFixed(2)}`,
          })),
          total: `$${Number(order.total).toFixed(2)}`,
          paymentMethod: order.paymentMethod.replace(/_/g, " "),
        });
        emailTpl.to = order.customerEmail;
        sendEmail(emailTpl).catch(() => {});
      }

      if (validated.status === "READY_FOR_PICKUP" && order.customerEmail) {
        const emailTpl = orderReadyEmail({
          customerName: order.customerFirstName,
          orderNumber: order.orderNumber,
        });
        emailTpl.to = order.customerEmail;
        sendEmail(emailTpl).catch(() => {});
      }

      if (validated.status === "REJECTED" && order.customerEmail) {
        const emailTpl = orderReadyEmail({
          customerName: order.customerFirstName,
          orderNumber: order.orderNumber,
        });
        emailTpl.to = order.customerEmail;
        emailTpl.subject = `Your Order ${order.orderNumber} was Rejected`;
        emailTpl.html = emailTpl.html.replace(
          "Ready for Pickup!",
          "Order Rejected"
        ).replace(
          /is ready.*$/,
          "was rejected."
        ).replace(
          /Please bring.*$/,
          order.rejectionReason
            ? `Reason: ${order.rejectionReason}`
            : "Please contact us for more information."
        );
        sendEmail(emailTpl).catch(() => {});
      }

      return NextResponse.json({ success: true, data: order });
    }

    // Customer can only cancel their own order
    if (validated.status === "CANCELLED") {
      if (!userEmail) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }

      const order = await db.order.findFirst({
        where: { id, customerEmail: userEmail },
      });

      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        return NextResponse.json(
          { success: false, error: "Order cannot be cancelled in its current state" },
          { status: 400 }
        );
      }

      const updated = await db.order.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { items: true },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
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

    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        ...(isAdmin ? {} : email ? { customerEmail: email } : session?.user?.email ? { customerEmail: session.user.email } : {}),
      },
      include: { items: true },
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
