/**
 * Shared order status transition service.
 *
 * Both the admin REST API (PUT /api/orders/[id]) and the Telegram bot use this
 * so a status change always persists the same way and fires the same customer
 * email + Telegram notifications.
 */

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { sendEmail, orderConfirmationEmail, orderReadyEmail } from "@/lib/email";
import { notifyOrderStatusChange } from "@/lib/telegram";

export type OrderStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "CANCELLED"
  | "REJECTED";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export async function deleteFromR2(url: string) {
  if (!R2_PUBLIC_URL || !url.startsWith(R2_PUBLIC_URL)) return;
  const key = url.replace(R2_PUBLIC_URL, "").replace(/^\//, "");
  if (!key) return;
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
}

export interface ChangeOrderStatusResult {
  ok: boolean;
  error?: string;
  code?: number;
  // Prisma order with items + paymentProofs included.
  order?: unknown;
}

/**
 * Apply a status transition to an order: persist it, send the customer email
 * (for the relevant transitions) and the customer Telegram notification.
 *
 * Actor type is informational (used for actions that need to know the source).
 */
export async function changeOrderStatus(params: {
  orderId: string;
  status: OrderStatusValue;
  rejectionReason?: string;
  actorType?: "ADMIN" | "CUSTOMER" | "SYSTEM";
}): Promise<ChangeOrderStatusResult> {
  const { orderId, status, rejectionReason, actorType = "ADMIN" } = params;

  if (status === "REJECTED" && !rejectionReason) {
    return { ok: false, error: "Rejection reason is required", code: 400 };
  }

  const existing = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, receiptImage: true },
  });
  if (!existing) {
    return { ok: false, error: "Order not found", code: 404 };
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "REJECTED") {
    updateData.rejectionReason = rejectionReason;
    if (existing.receiptImage) {
      await deleteFromR2(existing.receiptImage).catch(() => {});
    }
  }
  if (status === "CONFIRMED") {
    updateData.rejectionReason = null;
  }

  const order = await db.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      items: true,
      paymentProofs: {
        include: { paymentMethodDefinition: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // ---- Email notifications ----
  if (status === "CONFIRMED" && order.customerEmail) {
    const emailTpl = orderConfirmationEmail({
      customerName: order.customerFirstName,
      orderNumber: order.orderNumber,
      items: order.items.map((item) => ({
        name: item.optionLabel ? `${item.productName} (${item.optionLabel})` : item.productName,
        quantity: item.quantity,
        price: `$${Number(item.productPrice).toFixed(2)}`,
      })),
      total: `$${Number(order.total).toFixed(2)}`,
      paymentMethod: order.paymentMethod.replace(/_/g, " "),
    });
    emailTpl.to = order.customerEmail;
    sendEmail(emailTpl).catch(() => {});
  }

  if (status === "READY_FOR_PICKUP" && order.customerEmail) {
    const emailTpl = orderReadyEmail({
      customerName: order.customerFirstName,
      orderNumber: order.orderNumber,
    });
    emailTpl.to = order.customerEmail;
    sendEmail(emailTpl).catch(() => {});
  }

  if (status === "REJECTED" && order.customerEmail) {
    const emailTpl = orderReadyEmail({
      customerName: order.customerFirstName,
      orderNumber: order.orderNumber,
    });
    emailTpl.to = order.customerEmail;
    emailTpl.subject = `Your Order ${order.orderNumber} was Rejected`;
    emailTpl.html = emailTpl.html
      .replace("Ready for Pickup!", "Order Rejected")
      .replace(/is ready.*$/, "was rejected.")
      .replace(
        /Please bring.*$/,
        order.rejectionReason
          ? `Reason: ${order.rejectionReason}`
          : "Please contact us for more information."
      );
    sendEmail(emailTpl).catch(() => {});
  }

  // ---- Telegram notification to the customer ----
  if (
    ["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "CANCELLED", "REJECTED"].includes(status)
  ) {
    const settings = await db.settings.findFirst();
    await notifyOrderStatusChange(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        customerFirstName: order.customerFirstName,
        customerEmail: order.customerEmail,
        userId: order.userId,
        rejectionReason: order.rejectionReason,
        items: order.items.map((item) => ({
          name: item.optionLabel ? `${item.productName} (${item.optionLabel})` : item.productName,
          quantity: item.quantity,
          price: Number(item.productPrice),
        })),
      },
      {
        storeName: settings?.storeName ?? "",
        storeAddress: settings?.storeAddress ?? "",
      }
    );
  }

  void actorType;

  return { ok: true, order };
}
