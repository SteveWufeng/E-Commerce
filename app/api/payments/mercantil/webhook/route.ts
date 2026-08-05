export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "node:crypto";
import { notifyOrderStatusChange } from "@/lib/telegram";

interface MercantilWebhookPayload {
  transactionId?: string;
  status?: string;
  invoiceNumber?: string;
  orderNumber?: string;
  signature?: string;
  [key: string]: unknown;
}

function verifySignature(payload: Record<string, unknown>, signature: string, secret: string): boolean {
  const { signature: _, ...data } = payload;
  const sorted = Object.keys(data)
    .sort()
    .map((k) => `${k}=${String(data[k])}`)
    .join("&");
  const expected = crypto.createHmac("sha256", secret).update(sorted).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  try {
    const payload: MercantilWebhookPayload = await request.json();

    const secret = process.env.DOMINIO_API_SECRET;
    if (secret && payload.signature) {
      if (!verifySignature(payload, payload.signature, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const orderNumber = payload.invoiceNumber || payload.orderNumber;
    if (!orderNumber) {
      return NextResponse.json({ error: "Missing order identifier" }, { status: 400 });
    }

    const order = await db.order.findUnique({ where: { orderNumber } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const status = payload.status?.toLowerCase();
    if (status === "approved" || status === "success" || status === "completed") {
      const updated = await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "COMPLETED",
          status: "CONFIRMED",
          paymentIntentId: payload.transactionId || order.paymentIntentId,
        },
      });

      const settings = await db.settings.findFirst();
      await notifyOrderStatusChange(
        {
          id: updated.id,
          orderNumber: updated.orderNumber,
          status: updated.status,
          total: Number(updated.total),
          paymentMethod: updated.paymentMethod,
          customerFirstName: updated.customerFirstName,
          customerEmail: updated.customerEmail,
          userId: updated.userId,
          rejectionReason: null,
          items: [],
        },
        {
          storeName: settings?.storeName ?? "",
          storeAddress: settings?.storeAddress ?? "",
        }
      );
    } else if (status === "rejected" || status === "failed" || status === "cancelled") {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
