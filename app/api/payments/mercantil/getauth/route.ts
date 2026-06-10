export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requestAuth } from "@/lib/payments/mercantil-card";
import { z } from "zod";

const getauthSchema = z.object({
  cardNumber: z.string().min(13).max(19),
  customerId: z.string().min(1),
  paymentMethod: z.enum(["tdc", "tdd"]),
  orderId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = getauthSchema.parse(body);

    const result = await requestAuth({
      cardNumber: validated.cardNumber,
      customerId: validated.customerId,
      paymentMethod: validated.paymentMethod,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Auth request failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        authReference: result.authReference,
        message: result.message,
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
      { success: false, error: "Failed to process auth request" },
      { status: 500 }
    );
  }
}
