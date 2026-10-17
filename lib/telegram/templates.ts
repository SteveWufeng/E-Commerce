/**
 * Order-status Telegram message templates (pure, client-safe).
 *
 * This module has no server-only imports so it can be shared by the admin
 * settings UI and the Telegram service alike.
 *
 * Placeholders are replaced by `renderTemplate` with already-escaped values:
 *   {orderNumber} {customerName} {storeName} {storeAddress} {total}
 *   {paymentMethod} {items} {status} {rejectionReason} {rejectionReasonBlock}
 */

export type OrderTemplates = Record<string, string>;

/** Default, admin-editable order status message templates. */
export const DEFAULT_ORDER_TEMPLATES: OrderTemplates = {
  CONFIRMED:
    `🛒 <b>Order Confirmed</b>\n\n` +
    `Order <b>{orderNumber}</b> has been confirmed.\n\n` +
    `<b>Items:</b>\n{items}\n\n` +
    `<b>Total:</b> {total}\n` +
    `<b>Payment:</b> {paymentMethod}`,
  READY_FOR_PICKUP:
    `📦 <b>Ready for Pickup!</b>\n\n` +
    `Your order <b>{orderNumber}</b> is ready for pickup.\n\n` +
    `📍 {storeName}\n` +
    `{storeAddress}\n\n` +
    `Please bring your order number or a valid ID when you arrive.`,
  PICKED_UP:
    `✅ <b>Order Picked Up</b>\n\n` +
    `Thank you for shopping with us, {customerName}! ` +
    `Your order <b>{orderNumber}</b> has been marked as picked up.`,
  CANCELLED:
    `❌ <b>Order Cancelled</b>\n\n` +
    `Your order <b>{orderNumber}</b> has been cancelled.`,
  REJECTED:
    `❌ <b>Order Rejected</b>\n\n` +
    `Your order <b>{orderNumber}</b> was rejected.{rejectionReasonBlock}`,
  PAYMENT_PROOF_REJECTED:
    `⚠️ <b>Payment proof needs attention</b>\n\n` +
    `We couldn't verify the payment proof for order <b>{orderNumber}</b>.{rejectionReasonBlock}\n\n` +
    `Please re-upload a clear proof of payment so we can continue processing your order.`,
};

/** Statuses whose customer message can be customised by the admin. */
export const ORDER_TEMPLATE_STATUSES = [
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "CANCELLED",
  "REJECTED",
  "PAYMENT_PROOF_REJECTED",
] as const;

/** Placeholders the admin can use inside a template. */
export const ORDER_TEMPLATE_PLACEHOLDERS = [
  "{orderNumber}",
  "{customerName}",
  "{storeName}",
  "{storeAddress}",
  "{total}",
  "{paymentMethod}",
  "{items}",
  "{status}",
  "{rejectionReason}",
  "{rejectionReasonBlock}",
] as const;

/**
 * Replace {placeholder} tokens with the supplied values. Unknown tokens are
 * left untouched so admins aren't surprised by stray braces.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  );
}
