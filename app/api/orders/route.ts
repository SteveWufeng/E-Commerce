export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processPayment } from "@/lib/payments";
import { generateMercantilRedirect } from "@/lib/payments/mercantil";
import type { MercantilTransactionData } from "@/lib/payments/mercantil";
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
  paymentMethod: z.string().min(1),
  paymentMethodDefinitionId: z.string().optional(),
  subtotal: z.number().positive(),
  tax: z.number().min(0),
  total: z.number().positive(),
  notes: z.string().optional(),
  receiptImage: z.string().optional(),
  paymentTransactionId: z.string().optional(),
  cardLastFour: z.string().optional(),
  proofTransactionId: z.string().optional(),
  proofAmount: z.number().optional(),
  proofImageUrl: z.string().optional(),
  proofNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await db.order.count();
    const orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    const productIds = validated.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const unavailableItems: string[] = [];

    for (const item of validated.items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        unavailableItems.push(`Product "${item.productId}" is no longer available`);
      } else if (product.stock < item.quantity) {
        unavailableItems.push(
          `"${product.name}" only has ${product.stock} in stock (you requested ${item.quantity})`
        );
      }
    }

    if (unavailableItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Some items are no longer available: ${unavailableItems.join("; ")}`,
        },
        { status: 409 }
      );
    }

    const hasPaymentMethodDefinition = !!validated.paymentMethodDefinitionId;
    const isDeferredPayment = hasPaymentMethodDefinition || validated.paymentMethod === "MERCANTIL";
    let paymentTransactionId: string | null = null;
    let mercantilRedirectUrl: string | undefined;

    if (validated.paymentMethod === "MERCANTIL") {
      if (validated.paymentTransactionId) {
        paymentTransactionId = validated.paymentTransactionId;
      } else {
        const settings = await db.settings.findFirst();
        const redirectEnabled = settings?.mercantilRedirectEnabled ?? false;

        if (redirectEnabled) {
          const txData: MercantilTransactionData = {
            amount: Number(validated.total),
            customerName: `${validated.firstName} ${validated.lastName}`,
            returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/orders?order=${orderNumber}`,
            merchantId: process.env.MERCHANT_RIF || '',
            invoiceNumber: {
              number: orderNumber,
              invoiceCreationDate: new Date().toISOString().slice(0, 10),
            },
            contract: {
              contractNumber: `contract_${orderNumber}`,
              contractDate: new Date().toISOString().slice(0, 10),
            },
            trxType: "compra",
            currency: "ves",
            paymentConcepts: ["b2b", "c2p", "tdd"],
          };

          const mercantilResult = await generateMercantilRedirect(txData);
          if (!mercantilResult.success) {
            return NextResponse.json(
              { success: false, error: mercantilResult.error || "Failed to generate Mercantil payment" },
              { status: 500 }
            );
          }
          mercantilRedirectUrl = mercantilResult.redirectUrl;
        }
      }
    } else if (!isDeferredPayment) {
      const payment = await processPayment({
        amount: Math.round(validated.total * 100),
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

      paymentTransactionId = payment.transactionId;
    }

    const order = await db.$transaction(async (tx) => {
      const itemsData = await Promise.all(
        validated.items.map(async (item) => {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (!product) throw new Error(`Product ${item.productId} not found`);
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }

          await tx.product.update({
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
      );

      const proofData = hasPaymentMethodDefinition && validated.paymentMethodDefinitionId
        ? {
            paymentProofs: {
              create: {
                paymentMethodDefinitionId: validated.paymentMethodDefinitionId,
                transactionId: validated.proofTransactionId || null,
                amount: validated.proofAmount ? Number(validated.proofAmount) : null,
                imageUrl: validated.proofImageUrl || null,
                notes: validated.proofNotes || null,
              },
            },
          }
        : {};

      return tx.order.create({
        data: {
          orderNumber,
          customerEmail: validated.email,
          customerFirstName: validated.firstName,
          customerLastName: validated.lastName,
          customerPhone: validated.phone || null,
          subtotal: validated.subtotal,
          tax: validated.tax,
          total: validated.total,
          paymentMethod: hasPaymentMethodDefinition
            ? validated.paymentMethodDefinitionId!
            : validated.paymentMethod,
          paymentStatus: paymentTransactionId ? "COMPLETED" : isDeferredPayment ? "PENDING" : "COMPLETED",
          paymentIntentId: paymentTransactionId,
          cardLastFour: validated.cardLastFour || null,
          receiptImage: validated.receiptImage || null,
          notes: validated.notes || null,
          items: {
            create: itemsData,
          },
          ...proofData,
        },
        include: {
          items: true,
          paymentProofs: {
            include: { paymentMethodDefinition: true },
          },
        },
      });
    });

    const emailTemplate = orderConfirmationEmail({
      customerName: validated.firstName,
      orderNumber,
      items: order.items.map((item: (typeof order.items)[number]) => ({
        name: item.productName,
        quantity: item.quantity,
        price: `$${Number(item.productPrice).toFixed(2)}`,
      })),
      total: `$${Number(order.total).toFixed(2)}`,
      paymentMethod: hasPaymentMethodDefinition
        ? (order.paymentProofs?.[0]?.paymentMethodDefinition?.name || "Custom Payment")
        : isDeferredPayment
          ? "Mercantil Payment"
          : validated.paymentMethod.replace(/_/g, " "),
    });
    emailTemplate.to = validated.email;
    await sendEmail(emailTemplate);

    if (validated.phone) {
      const smsTemplate = orderConfirmationSms({
        orderNumber,
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
          paymentTransactionId,
          ...(mercantilRedirectUrl ? { redirectUrl: mercantilRedirectUrl } : {}),
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const orderId = searchParams.get("id");
    const maxLimit = Math.min(parseInt(limit || "50") || 50, 100);

    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    const isAdmin = userRole === "ADMIN";

    if (!session?.user && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (orderId) {
      const where: Record<string, unknown> = isAdmin
        ? { OR: [{ id: orderId }, { orderNumber: orderId }] }
        : {
            OR: [{ id: orderId }, { orderNumber: orderId }],
            customerEmail: session?.user?.email,
          };

      const order = await db.order.findFirst({
        where,
        include: {
          items: true,
          paymentProofs: {
            include: { paymentMethodDefinition: true },
            orderBy: { createdAt: "desc" },
          },
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

    const userEmail = session?.user?.email;
    const orders = await db.order.findMany({
      where: isAdmin ? {} : { customerEmail: userEmail || "" },
      include: {
        items: true,
        paymentProofs: {
          include: { paymentMethodDefinition: true },
          orderBy: { createdAt: "desc" },
        },
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
