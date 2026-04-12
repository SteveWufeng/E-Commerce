/**
 * Orders API — Create and manage orders.
 *
 * POST /api/orders       — Create a new order (public, with payment)
 * GET  /api/orders       — List user's orders (authenticated users only)
 * GET  /api/orders/[id]  — Get single order (authenticated user or admin)
 * PUT  /api/orders/[id]  — Update order status (admin only)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processPayment } from "@/lib/payments";
import { sendEmail, orderConfirmationEmail } from "@/lib/email";
import { sendSms, orderConfirmationSms } from "@/lib/sms";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createOrderSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  paymentMethod: z.enum(["CREDIT_CARD", "GOOGLE_PAY", "PAYPAL", "CASH_ON_PICKUP"]),
  pickupSlotId: z.string(),
  subtotal: z.number().positive(),
  tax: z.number().min(0),
  total: z.number().positive(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // Generate order number
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await db.order.count();
    const orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    // Process payment
    const payment = await processPayment({
      amount: Math.round(validated.total * 100), // Convert to cents
      currency: "usd",
      method: validated.paymentMethod,
      orderId: orderNumber,
      customerEmail: validated.email,
    });

    if (!payment.success) {
      return NextResponse.json(
        { success: false, error: payment.error || "Payment failed" },
        { status: 402 }
      );
    }

    // Create order in database
    const order = await db.order.create({
      data: {
        orderNumber,
        customerEmail: validated.email,
        customerFirstName: validated.firstName,
        customerLastName: validated.lastName,
        customerPhone: validated.phone || null,
        subtotal: validated.subtotal,
        tax: validated.tax,
        total: validated.total,
        paymentMethod: validated.paymentMethod,
        paymentStatus: "COMPLETED",
        paymentIntentId: payment.paymentIntentId,
        notes: validated.notes || null,
        pickupSlot: {
          connect: { id: validated.pickupSlotId },
        },
        items: {
          create: await Promise.all(
            validated.items.map(async (item) => {
              const product = await db.product.findUnique({
                where: { id: item.productId },
              });
              if (!product) throw new Error(`Product ${item.productId} not found`);

              // Deduct stock
              await db.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
              });

              return {
                productId: item.productId,
                productName: product.name,
                productPrice: product.price,
                productCost: product.cost,
                quantity: item.quantity,
              };
            })
          ),
        },
      },
      include: {
        items: true,
        pickupSlot: true,
      },
    });

    // Send confirmation email
    const emailTemplate = orderConfirmationEmail({
      customerName: validated.firstName,
      orderNumber,
      items: order.items.map((item: (typeof order.items)[number]) => ({
        name: item.productName,
        quantity: item.quantity,
        price: `$${Number(item.productPrice).toFixed(2)}`,
      })),
      total: `$${Number(order.total).toFixed(2)}`,
      pickupDate: order.pickupSlot
        ? new Date(order.pickupSlot.date).toLocaleDateString()
        : "TBD",
      pickupTime: order.pickupSlot
        ? `${order.pickupSlot.startTime} - ${order.pickupSlot.endTime}`
        : "TBD",
    });
    emailTemplate.to = validated.email;
    await sendEmail(emailTemplate);

    // Send SMS if phone provided
    if (validated.phone) {
      const smsTemplate = orderConfirmationSms({
        orderNumber,
        pickupDate: order.pickupSlot
          ? new Date(order.pickupSlot.date).toLocaleDateString()
          : "TBD",
        pickupTime: order.pickupSlot
          ? `${order.pickupSlot.startTime} - ${order.pickupSlot.endTime}`
          : "TBD",
      });
      smsTemplate.to = validated.phone;
      await sendSms(smsTemplate);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentTransactionId: payment.transactionId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Orders API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create order",
      },
      { status: 500 }
    );
  }
}

// GET handler - returns user's own orders when authenticated
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const orderId = searchParams.get("id");
    const maxLimit = Math.min(parseInt(limit || "50") || 50, 100);

    const session = await auth();

    // Require authentication - unauthenticated users cannot see any orders
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "User email not found in session" },
        { status: 400 }
      );
    }

    // If fetching a single order by ID or orderNumber
    if (orderId) {
      const order = await db.order.findFirst({
        where: {
          OR: [
            { id: orderId },
            { orderNumber: orderId },
          ],
          customerEmail: userEmail,
        },
        include: {
          items: true,
          pickupSlot: true,
        },
      });

      if (!order) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: order });
    }

    // Fetch only orders belonging to the authenticated user
    const orders = await db.order.findMany({
      where: {
        customerEmail: userEmail,
      },
      include: {
        items: true,
        pickupSlot: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: maxLimit,
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Orders API GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
