/**
 * Order ID API — Update, delete or get a specific order.
 *
 * GET    /api/orders/[id]  — Get single order
 * PUT    /api/orders/[id]  — Update order status (admin or staff)
 * DELETE /api/orders/[id]  — Permanently delete an order (admin only)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { changeOrderStatus, deleteFromR2 } from "@/lib/orders/status";
import { notifyAdmins, buildAdminCancellationMessage } from "@/lib/telegram";

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "CANCELLED", "REJECTED"]).optional(),
  paymentIntentId: z.string().optional(),
  paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
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

    // Admin and staff can do any status change
    if (userRole === "ADMIN" || userRole === "STAFF") {
      // Non-status fields are updated directly.
      const updateData: Record<string, unknown> = {};
      if (validated.paymentIntentId !== undefined) {
        updateData.paymentIntentId = validated.paymentIntentId;
      }
      if (validated.paymentStatus !== undefined) {
        updateData.paymentStatus = validated.paymentStatus;
      }
      if (Object.keys(updateData).length > 0) {
        await db.order.update({ where: { id }, data: updateData });
      }

      if (validated.status) {
        const result = await changeOrderStatus({
          orderId: id,
          status: validated.status,
          rejectionReason: validated.rejectionReason,
          actorType: "ADMIN",
        });
        if (!result.ok) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: result.code ?? 500 }
          );
        }
        return NextResponse.json({ success: true, data: result.order });
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { success: false, error: "No fields to update" },
          { status: 400 }
        );
      }

      const order = await db.order.findUnique({
        where: { id },
        include: {
          items: true,
          paymentProofs: {
            include: { paymentMethodDefinition: true },
            orderBy: { createdAt: "desc" },
          },
        },
      });

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

      const result = await changeOrderStatus({
        orderId: id,
        status: "CANCELLED",
        actorType: "CUSTOMER",
      });

      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.code ?? 500 }
        );
      }

      // Alert admins that a customer cancelled.
      notifyAdmins(
        buildAdminCancellationMessage({
          orderNumber: order.orderNumber,
          status: "CANCELLED",
          paymentStatus: order.paymentStatus,
          total: Number(order.total),
          customerFirstName: order.customerFirstName,
          createdAt: order.createdAt,
        }),
        undefined,
        {
          kind: "ORDER_CANCELLED",
          title: `Order cancelled ${order.orderNumber}`,
          orderId: order.id,
          userId: order.userId ?? undefined,
        }
      ).catch(() => {});

      return NextResponse.json({ success: true, data: result.order });
    }

    if (!validated.status && !validated.paymentIntentId && !validated.paymentStatus) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
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
      include: {
        items: true,
        paymentProofs: {
          include: { paymentMethodDefinition: true },
          orderBy: { createdAt: "desc" },
        },
      },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const order = await db.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      select: {
        id: true,
        receiptImage: true,
        paymentProofs: { select: { imageUrl: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Best-effort cleanup of uploaded receipt / proof images.
    const files = [
      order.receiptImage,
      ...order.paymentProofs.map((proof) => proof.imageUrl),
    ].filter((url): url is string => Boolean(url));
    await Promise.all(files.map((url) => deleteFromR2(url).catch(() => {})));

    // Cascades to OrderItem and PaymentProof rows; Message.orderId is set null.
    await db.order.delete({ where: { id: order.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete order" }, { status: 500 });
  }
}
