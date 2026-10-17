export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "node:crypto";
import { notifyAdmins, buildAdminPaymentUpdateMessage, adminOrderUrl } from "@/lib/telegram";
import { changeOrderStatus } from "@/lib/orders/status";

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
      // Persist payment fields, then apply the CONFIRMED transition (which also
      // emails and Telegram-notifies the customer) via the shared service.
      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "COMPLETED",
          paymentIntentId: payload.transactionId || order.paymentIntentId,
        },
      });

      const result = await changeOrderStatus({
        orderId: order.id,
        status: "CONFIRMED",
        actorType: "SYSTEM",
      });

      if (result.ok) {
        notifyAdmins(
          buildAdminPaymentUpdateMessage(
            {
              orderNumber: order.orderNumber,
              status: "CONFIRMED",
              paymentStatus: "COMPLETED",
              total: Number(order.total),
              customerFirstName: order.customerFirstName,
              createdAt: order.createdAt,
            },
            "Payment approved via Mercantil (card redirect)."
          ),
          [{ text: "📋 View in dashboard", url: adminOrderUrl(order.orderNumber) }],
          {
            kind: "PAYMENT_UPDATE",
            title: `Payment approved ${order.orderNumber}`,
            orderId: order.id,
            userId: order.userId ?? undefined,
            link: adminOrderUrl(order.orderNumber),
          }
        ).catch(() => {});
      }
    } else if (status === "rejected" || status === "failed" || status === "cancelled") {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });

      notifyAdmins(
        buildAdminPaymentUpdateMessage(
          {
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: "FAILED",
            total: Number(order.total),
            customerFirstName: order.customerFirstName,
            createdAt: order.createdAt,
          },
          "Payment FAILED via Mercantil (card redirect)."
        ),
        [{ text: "📋 View in dashboard", url: adminOrderUrl(order.orderNumber) }],
        {
          kind: "PAYMENT_UPDATE",
          title: `Payment failed ${order.orderNumber}`,
          orderId: order.id,
          userId: order.userId ?? undefined,
          link: adminOrderUrl(order.orderNumber),
        }
      ).catch(() => {});
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
