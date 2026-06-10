export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { confirmPayment } from "@/lib/payments/mercantil-card";
import { db } from "@/lib/db";
import { z } from "zod";

const paySchema = z.object({
  cardNumber: z.string().min(13).max(19),
  expirationDate: z.string().min(4).max(7),
  cvv: z.string().min(3).max(4),
  customerId: z.string().min(1),
  paymentMethod: z.enum(["tdc", "tdd"]),
  otp: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("ves"),
  invoiceNumber: z.string().min(1),
  orderId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = paySchema.parse(body);

    const result = await confirmPayment({
      cardNumber: validated.cardNumber,
      expirationDate: validated.expirationDate,
      cvv: validated.cvv,
      customerId: validated.customerId,
      paymentMethod: validated.paymentMethod,
      otp: validated.otp,
      amount: validated.amount,
      currency: validated.currency,
      invoiceNumber: validated.invoiceNumber,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Payment failed" },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { id: validated.orderId },
    });

    if (order) {
      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "COMPLETED",
          status: "CONFIRMED",
          paymentIntentId: result.transactionId || order.paymentIntentId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        paymentReference: result.paymentReference,
        orderId: validated.orderId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
