export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, paymentMethodDefinitionId, transactionId, amount, imageUrl, notes } = body;

    if (!orderId || !paymentMethodDefinitionId) {
      return NextResponse.json(
        { success: false, error: "Order ID and payment method definition ID are required" },
        { status: 400 }
      );
    }

    const session = await auth();
    const userEmail = session?.user?.email;

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (userEmail && userEmail !== order.customerEmail) {
      return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
    }

    if (!userEmail && order.customerEmail) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const method = await db.paymentMethodDefinition.findUnique({
      where: { id: paymentMethodDefinitionId },
    });

    if (!method || !method.isActive) {
      return NextResponse.json({ success: false, error: "Payment method not found or inactive" }, { status: 400 });
    }

    if (method.requiresTransactionId && !transactionId) {
      return NextResponse.json({ success: false, error: "Transaction ID is required for this payment method" }, { status: 400 });
    }

    if (method.requiresTransactionId && transactionId) {
      const existingProof = await db.paymentProof.findFirst({
        where: { transactionId },
      });
      if (existingProof) {
        return NextResponse.json({ success: false, error: "Transaction ID already used" }, { status: 409 });
      }
    }

    if (method.proofImageRequired && !imageUrl) {
      return NextResponse.json({ success: false, error: "Proof image is required for this payment method" }, { status: 400 });
    }

    const existingProof = await db.paymentProof.findFirst({
      where: { orderId, paymentMethodDefinitionId },
    });

    let proof;
    if (existingProof) {
      proof = await db.paymentProof.update({
        where: { id: existingProof.id },
        data: {
          transactionId: transactionId || null,
          amount: amount ? Number(amount) : null,
          imageUrl: imageUrl || null,
          notes: notes || null,
          status: "PENDING",
          rejectionReason: null,
        },
        include: { paymentMethodDefinition: true },
      });
    } else {
      proof = await db.paymentProof.create({
        data: {
          orderId,
          paymentMethodDefinitionId,
          transactionId: transactionId || null,
          amount: amount ? Number(amount) : null,
          imageUrl: imageUrl || null,
          notes: notes || null,
        },
        include: { paymentMethodDefinition: true },
      });
    }

    const paymentProofs = await db.paymentProof.findMany({
      where: { orderId },
      include: { paymentMethodDefinition: true },
    });

    return NextResponse.json({ success: true, data: { proof, paymentProofs } });
  } catch (error) {
    console.error("Proof POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit proof" }, { status: 500 });
  }
}
