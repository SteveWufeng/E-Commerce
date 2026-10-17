/**
 * Telegram notification service.
 *
 * Sends order status notifications to customers via the Telegram Bot API,
 * with admin-managed credentials (encrypted at rest) and env fallback.
 *
 * Environment variables:
 * - TELEGRAM_BOT_TOKEN: fallback bot token when admin settings are unset
 * - TELEGRAM_ENCRYPTION_KEY: key for encrypting the token at rest (falls back to NEXTAUTH_SECRET)
 * - NEXT_PUBLIC_BASE_URL: base URL for "View Order" buttons
 */

import crypto from "node:crypto";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "./encryption";
import {
  DEFAULT_ORDER_TEMPLATES,
  renderTemplate,
  type OrderTemplates,
} from "./templates";

const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramConfig {
  enabled: boolean;
  botToken: string | null;
  botUsername: string | null;
}

export interface TelegramButton {
  text: string;
  url?: string;
  callbackData?: string;
}

export interface OrderNotificationData {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  paymentMethod: string;
  customerFirstName: string;
  items: { name: string; quantity: number; price: string }[];
  rejectionReason?: string | null;
  storeName: string;
  storeAddress: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * Load the Telegram configuration from the Settings table.
 * Falls back to TELEGRAM_BOT_TOKEN env var when no token is stored in the DB.
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  const settings = await db.settings.findFirst();

  let botToken: string | null = null;
  if (settings?.telegramBotToken) {
    try {
      botToken = decryptSecret(settings.telegramBotToken);
    } catch (error) {
      console.error("[Telegram] Failed to decrypt bot token:", error);
    }
  }
  if (!botToken && process.env.TELEGRAM_BOT_TOKEN) {
    botToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  return {
    enabled: settings?.telegramEnabled ?? Boolean(process.env.TELEGRAM_BOT_TOKEN),
    botToken,
    botUsername: settings?.telegramBotUsername ?? null,
  };
}

/**
 * Persist the Telegram configuration, encrypting the bot token at rest.
 * Pass null/undefined for botToken to keep the existing stored token.
 */
export async function saveTelegramConfig(input: {
  enabled?: boolean;
  botToken?: string | null;
  botUsername?: string | null;
}): Promise<void> {
  const current = await db.settings.findFirst();

  const data: {
    telegramEnabled?: boolean;
    telegramBotToken?: string | null;
    telegramBotUsername?: string | null;
  } = {};

  if (input.enabled !== undefined) {
    data.telegramEnabled = input.enabled;
  }
  if (input.botUsername !== undefined) {
    data.telegramBotUsername = input.botUsername?.trim() || null;
  }
  if (input.botToken !== undefined) {
    data.telegramBotToken = input.botToken ? encryptSecret(input.botToken.trim()) : null;
  }

  if (current) {
    await db.settings.update({ where: { id: current.id }, data });
  } else {
    await db.settings.create({ data });
  }
}

/**
 * Verify a bot token via the getMe endpoint.
 * Returns the bot username on success.
 */
export async function testTelegramConnection(token: string): Promise<{
  ok: boolean;
  botUsername?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token.trim()}/getMe`);
    const data = await res.json();
    if (!res.ok || data.ok !== true) {
      return { ok: false, error: data?.description || `HTTP ${res.status}` };
    }
    return { ok: true, botUsername: data.result?.username };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

/**
 * Send a text message to a chat with inline buttons.
 * Retries on Telegram rate limits (HTTP 429) with exponential backoff.
 */
export async function sendTelegramMessage(params: {
  token: string;
  chatId: string;
  text: string;
  buttons?: TelegramButton[];
}): Promise<boolean> {
  const { token, chatId, text, buttons } = params;
  const maxRetries = 3;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };
      if (buttons && buttons.length > 0) {
        body.reply_markup = {
          inline_keyboard: buttons.map((b) =>
            b.callbackData
              ? [{ text: b.text, callback_data: b.callbackData }]
              : [{ text: b.text, url: b.url }]
          ),
        };
      }

      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) return true;

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        // Rate limited — wait retry_after if provided
        const retryAfter = Number(data?.parameters?.retry_after) || 1;
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        attempt++;
        continue;
      }

      if (res.status >= 500) {
        // Server error — backoff and retry
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
        attempt++;
        continue;
      }

      // 4xx (other than 429) — e.g. blocked by the user, invalid chat id.
      // No point retrying; return false so callers can fall back to email.
      console.warn(`[Telegram] sendMessage failed (${res.status}):`, data?.description || "unknown error");
      return false;
    } catch (error) {
      console.warn("[Telegram] sendMessage network error:", error);
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
      attempt++;
    }
  }

  return false;
}

/**
 * Escape text for Telegram's HTML parse mode so user-controlled content
 * (names, notes, message bodies) can never break the message or inject tags.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Default, admin-editable order status message templates.
 *
 * Placeholders are replaced by `renderTemplate` with escaped values:
 *   {orderNumber} {customerName} {storeName} {storeAddress} {total}
 *   {paymentMethod} {items} {status} {rejectionReason} {rejectionReasonBlock}
 */
export {
  DEFAULT_ORDER_TEMPLATES,
  ORDER_TEMPLATE_STATUSES,
  ORDER_TEMPLATE_PLACEHOLDERS,
  renderTemplate,
} from "./templates";
export type { OrderTemplates } from "./templates";

/**
 * Build the notification message for a given order status.
 *
 * Admin-configured `templates` (keyed by status) override the defaults.
 */
export function buildOrderMessage(
  order: OrderNotificationData,
  templates?: OrderTemplates | null
): string {
  const num = escapeHtml(order.orderNumber);
  const itemsSummary = order.items
    .slice(0, 5)
    .map((item) => `• ${escapeHtml(item.name)} ×${item.quantity} — ${item.price}`)
    .join("\n");
  const extraItems = order.items.length > 5
    ? `\n…and ${order.items.length - 5} more`
    : "";
  const items = `${itemsSummary}${extraItems}`;
  const reason = order.rejectionReason ? escapeHtml(order.rejectionReason) : "";

  const vars: Record<string, string> = {
    orderNumber: num,
    customerName: escapeHtml(order.customerFirstName),
    customerFirstName: escapeHtml(order.customerFirstName),
    storeName: escapeHtml(order.storeName),
    storeAddress: escapeHtml(order.storeAddress),
    total: order.total,
    paymentMethod: escapeHtml(order.paymentMethod),
    items,
    status: order.status.replace(/_/g, " ").toLowerCase(),
    rejectionReason: reason,
    rejectionReasonBlock: reason ? `\n\n<b>Reason:</b> ${reason}` : "",
  };

  const effective: OrderTemplates = { ...DEFAULT_ORDER_TEMPLATES, ...(templates ?? {}) };
  const template = effective[order.status];
  if (template && template.trim()) {
    return renderTemplate(template, vars);
  }

  return `ℹ️ Your order <b>${num}</b> is currently: ${order.status
    .replace(/_/g, " ")
    .toLowerCase()}.`;
}

/**
 * Load admin-configured order templates from Settings.
 * Returns only the overrides; `buildOrderMessage` merges them with defaults.
 */
export async function getOrderTemplates(): Promise<OrderTemplates> {
  try {
    const settings = await db.settings.findFirst({ select: { telegramTemplates: true } });
    const raw = settings?.telegramTemplates;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const out: OrderTemplates = {};
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === "string" && value.trim()) out[key] = value;
      }
      return out;
    }
  } catch (error) {
    console.error("[Telegram] Failed to load order templates:", error);
  }
  return {};
}

/**
 * Build the "View Order" inline button for a message.
 *
 * Uses the order's database id in the path (the storefront route is
 * `/orders/[id]`) and passes the human-readable number as a query param so the
 * detail page — which reads `?orderNumber=` — resolves it correctly.
 */
export function buildOrderButtons(orderNumber: string, orderId?: string): TelegramButton[] {
  const path = encodeURIComponent(orderId || orderNumber);
  const query = encodeURIComponent(orderNumber);
  return [{ text: "View Order Details", url: `${BASE_URL}/orders/${path}?orderNumber=${query}` }];
}

/**
 * Build a help message listing the commands the bot understands.
 */
export function buildHelpMessage(storeName: string, forAdmin = false): string {
  const store = escapeHtml(storeName);
  if (forAdmin) {
    return (
      `🤖 <b>${store}</b> — admin bot\n\n` +
      `<b>Browse</b>\n` +
      `/orders — recent orders across the store\n` +
      `/order ORDER_NUMBER — full status of any order (also /status)\n\n` +
      `<b>Update an order</b>\n` +
      `/confirm ORDER_NUMBER — mark confirmed\n` +
      `/ready ORDER_NUMBER — mark ready for pickup\n` +
      `/pickedup ORDER_NUMBER — mark picked up\n` +
      `/cancel ORDER_NUMBER — cancel the order\n` +
      `/reject ORDER_NUMBER REASON — reject with a reason\n\n` +
      `<b>Message a customer</b>\n` +
      `/reply ORDER_NUMBER MESSAGE — send a message to that order's customer\n\n` +
      `Or just tap the buttons under an order card to change its status.\n` +
      `Manage all conversations from the dashboard: ${BASE_URL}/admin/messages\n\n` +
      `/help — show this message`
    );
  }

  return (
    `🤖 <b>${store}</b> assistant\n\n` +
    `Here's what I can do:\n` +
    `/orders — your recent orders and their status\n` +
    `/order ORDER_NUMBER — status of a specific order\n` +
    `/help — show this message\n\n` +
    `You can also simply <b>send me a message</b> and the store team will reply here.\n\n` +
    `Order updates (confirmed, ready for pickup, and more) are sent here automatically.`
  );
}

/**
 * Build a message summarising a customer's most recent orders.
 */
export function buildOrdersListMessage(
  orders: {
    orderNumber: string;
    status: string;
    total: number | string | { toString(): string };
    createdAt: Date | string;
  }[],
  currencySymbol = "$",
  heading = "Your recent orders"
): string {
  const lines = orders.map((order) => {
    const date = new Date(order.createdAt).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const status = order.status.replace(/_/g, " ").toLowerCase();
    return `• <code>${escapeHtml(order.orderNumber)}</code>\n  ${status} — ${currencySymbol}${Number(order.total).toFixed(2)} · ${date}`;
  });
  return `📦 <b>${escapeHtml(heading)}</b>\n\n${lines.join("\n\n")}`;
}

/**
 * Build a detailed status report for a single order.
 */
export function buildOrderStatusMessage(
  order: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number | string | { toString(): string };
    createdAt: Date | string;
    customerFirstName?: string;
    items?: { productName: string; productPrice: number | string | { toString(): string }; quantity: number }[];
  },
  opts: { currencySymbol?: string; forAdmin?: boolean } = {}
): string {
  const currency = opts.currencySymbol ?? "$";
  const fmtDate = (value: Date | string) =>
    new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  const money = (value: number | string | { toString(): string }) => `${currency}${Number(value).toFixed(2)}`;

  const lines = [`📦 <b>${escapeHtml(order.orderNumber)}</b>`, ""];
  if (opts.forAdmin && order.customerFirstName) {
    lines.push(`Customer: ${escapeHtml(order.customerFirstName)}`);
  }
  lines.push(`Status: <b>${order.status.replace(/_/g, " ").toLowerCase()}</b>`);
  lines.push(`Payment: ${order.paymentStatus.replace(/_/g, " ").toLowerCase()}`);
  lines.push(`Total: ${money(order.total)}`);
  lines.push(`Placed: ${fmtDate(order.createdAt)}`);

  const items = order.items ?? [];
  if (items.length > 0) {
    lines.push("", "<b>Items:</b>");
    for (const item of items.slice(0, 5)) {
      lines.push(`• ${escapeHtml(item.productName)} ×${item.quantity} — ${money(item.productPrice)}`);
    }
    if (items.length > 5) {
      lines.push(`…and ${items.length - 5} more`);
    }
  }

  return lines.join("\n");
}

/**
 * Notify a customer about an order status change via Telegram.
 *
 * Resolves the customer's chat id (via userId or email match), checks the
 * global toggle + per-user opt-in, and sends the message fire-and-forget.
 * Failures are logged and never throw — order processing is never disrupted.
 */
export async function notifyOrderStatusChange(
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: number | string;
    paymentMethod: string;
    customerFirstName: string;
    customerEmail?: string | null;
    userId?: string | null;
    rejectionReason?: string | null;
    items?: { name: string; quantity: number; price: number | string }[];
  },
  settings: { storeName: string; storeAddress: string }
): Promise<void> {
  try {
    const config = await getTelegramConfig();
    if (!config.enabled || !config.botToken) return;

    const chatId = await resolveChatId(order);
    if (!chatId) return;

    const items = (order.items ?? []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: `$${Number(item.price).toFixed(2)}`,
    }));

    const templates = await getOrderTemplates();

    const message = buildOrderMessage(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: `$${Number(order.total).toFixed(2)}`,
        paymentMethod: order.paymentMethod.replace(/_/g, " "),
        customerFirstName: order.customerFirstName,
        items,
        rejectionReason: order.rejectionReason,
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
      },
      templates
    );

    const ok = await sendTelegramMessage({
      token: config.botToken,
      chatId,
      text: message,
      buttons: buildOrderButtons(order.orderNumber, order.id),
    });

    if (!ok) {
      console.warn(`[Telegram] Notification not delivered for order ${order.orderNumber}`);
    }
  } catch (error) {
    console.error("[Telegram] notifyOrderStatusChange error:", error);
  }
}

async function resolveChatId(order: {
  id: string;
  userId?: string | null;
  customerEmail?: string | null;
}): Promise<string | null> {
  let user = null;

  if (order.userId) {
    user = await db.user.findUnique({
      where: { id: order.userId },
      select: { telegramChatId: true, telegramOptIn: true },
    });
  }

  if (!user && order.customerEmail) {
    user = await db.user.findFirst({
      where: { email: order.customerEmail },
      select: { telegramChatId: true, telegramOptIn: true },
    });
  }

  if (!user?.telegramChatId || !user.telegramOptIn) return null;
  return user.telegramChatId;
}

/**
 * Generate a secure, single-use token for linking a Telegram account.
 * Previous unused tokens for the user are invalidated.
 */
export async function createTelegramLinkToken(userId: string): Promise<{
  token: string;
  expiresAt: Date;
  deepLink: string;
}> {
  await db.telegramLinkToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.telegramLinkToken.create({
    data: { userId, token, expiresAt },
  });

  const config = await getTelegramConfig();
  const username = (config.botUsername || "").replace(/^@/, "");
  const deepLink = username ? `https://t.me/${username}?start=${token}` : "";

  return { token, expiresAt, deepLink };
}

// ========================
// Outbound send helpers
// ========================

/** Base URL of the deployed storefront/admin. */
export const STORE_BASE_URL = BASE_URL;

/**
 * Send a message to a raw chat id (no user lookup, no opt-in check).
 * Used from the webhook where the chat id is already known.
 */
export async function sendTelegramChat(
  chatId: string,
  text: string,
  buttons?: TelegramButton[]
): Promise<boolean> {
  const config = await getTelegramConfig();
  if (!config.enabled || !config.botToken) return false;
  return sendTelegramMessage({ token: config.botToken, chatId, text, buttons });
}

/** Acknowledge a callback query so Telegram stops the button's loading spinner. */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const config = await getTelegramConfig();
  if (!config.botToken) return;
  try {
    await fetch(`${TELEGRAM_API}/bot${config.botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
    });
  } catch {
    // best effort
  }
}

/** Send a message to a specific user by id, respecting their Telegram opt-in. */
export async function sendTelegramToUser(
  userId: string,
  text: string,
  buttons?: TelegramButton[]
): Promise<boolean> {
  const config = await getTelegramConfig();
  if (!config.enabled || !config.botToken) return false;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true, telegramOptIn: true },
  });
  if (!user?.telegramChatId || !user.telegramOptIn) return false;

  return sendTelegramMessage({
    token: config.botToken,
    chatId: user.telegramChatId,
    text,
    buttons,
  });
}

/** Send a message to every linked, opted-in admin. Returns how many were reached. */
export async function notifyAdmins(
  text: string,
  buttons?: TelegramButton[],
  meta: AdminNotificationMeta = {}
): Promise<number> {
  // Always retain a copy in the dashboard, even when Telegram is disabled or no
  // admin is linked — so staff/admins can still see what was sent.
  await recordAdminNotification(text, meta);

  const config = await getTelegramConfig();
  if (!config.enabled || !config.botToken) return 0;

  const admins = await db.user.findMany({
    where: { role: "ADMIN", telegramChatId: { not: null }, telegramOptIn: true },
    select: { telegramChatId: true },
  });

  let sent = 0;
  for (const admin of admins) {
    if (!admin.telegramChatId) continue;
    const ok = await sendTelegramMessage({
      token: config.botToken,
      chatId: admin.telegramChatId,
      text,
      buttons,
    });
    if (ok) sent++;
  }
  return sent;
}

// ========================
// Admin notification history
// ========================

export interface AdminNotificationMeta {
  kind?: string;
  title?: string;
  orderId?: string;
  userId?: string;
  link?: string;
}

/** Convert Telegram HTML markup into readable plain text for the dashboard. */
export function htmlToText(html: string): string {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Persist a copy of an admin-bound message so it is visible in the dashboard
 * notification history. Never throws.
 */
export async function recordAdminNotification(
  text: string,
  meta: AdminNotificationMeta = {}
): Promise<void> {
  try {
    await db.adminNotification.create({
      data: {
        kind: meta.kind ?? "SYSTEM",
        title: meta.title ?? "Store notification",
        body: htmlToText(text),
        orderId: meta.orderId ?? null,
        userId: meta.userId ?? null,
        link: meta.link ?? null,
      },
    });
  } catch (error) {
    console.error("[Telegram] Failed to record admin notification:", error);
  }
}

// ========================
// Message builders
// ========================

export interface OrderDetail {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number | string | { toString(): string };
  paymentMethod?: string | null;
  createdAt: Date | string;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  items?: {
    productName: string;
    productPrice: number | string | { toString(): string };
    quantity: number;
  }[];
}

const STATUS_EMOJI: Record<string, string> = {
  PENDING: "🕒",
  CONFIRMED: "✅",
  READY_FOR_PICKUP: "📦",
  PICKED_UP: "🤝",
  CANCELLED: "❌",
  REJECTED: "🚫",
};

export function statusEmoji(status: string): string {
  return STATUS_EMOJI[status] ?? "ℹ️";
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

/** Message to the CUSTOMER confirming their order was received. */
export function buildOrderSubmittedMessage(
  order: Pick<OrderDetail, "orderNumber" | "total">,
  currencySymbol = "$"
): string {
  return (
    `🧾 <b>Order received!</b>\n\n` +
    `Thanks — we got your order <b>${escapeHtml(order.orderNumber)}</b>.\n` +
    `Total: ${currencySymbol}${Number(order.total).toFixed(2)}\n\n` +
    `We'll message you here as it progresses. Send /orders to check status anytime.`
  );
}

/** Message to ADMINS when a new order is submitted. */
export function buildNewOrderAdminMessage(
  order: OrderDetail,
  opts: { currencySymbol?: string } = {}
): string {
  const currency = opts.currencySymbol ?? "$";
  const money = (v: number | string | { toString(): string }) => `${currency}${Number(v).toFixed(2)}`;
  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const lines: string[] = [
    `🆕 <b>New order</b> <code>${escapeHtml(order.orderNumber)}</code>`,
    "",
  ];

  const name = [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ");
  if (name) lines.push(`👤 ${escapeHtml(name)}`);
  if (order.customerEmail) lines.push(`✉️ ${escapeHtml(order.customerEmail)}`);
  if (order.customerPhone) lines.push(`📞 ${escapeHtml(order.customerPhone)}`);

  const method = order.paymentMethod ? ` · ${escapeHtml(order.paymentMethod.replace(/_/g, " "))}` : "";
  lines.push(`${statusEmoji(order.status)} ${statusLabel(order.status)}${method}`);
  lines.push(`💵 ${money(order.total)}`);
  lines.push(`🗓 ${date}`);

  const items = order.items ?? [];
  if (items.length > 0) {
    lines.push("", "<b>Items:</b>");
    for (const item of items.slice(0, 5)) {
      lines.push(`• ${escapeHtml(item.productName)} ×${item.quantity} — ${money(item.productPrice)}`);
    }
    if (items.length > 5) lines.push(`…and ${items.length - 5} more`);
  }

  if (order.notes) lines.push("", `📝 ${escapeHtml(order.notes)}`);

  return lines.join("\n");
}

/** Alert to ADMINS when a customer cancels an order. */
export function buildAdminCancellationMessage(order: OrderDetail, currencySymbol = "$"): string {
  return (
    `❌ <b>Order cancelled</b> <code>${escapeHtml(order.orderNumber)}</code>\n\n` +
    `${escapeHtml(order.customerFirstName ?? "A customer")} cancelled this order.\n` +
    `Total: ${currencySymbol}${Number(order.total).toFixed(2)}`
  );
}

/** Alert to ADMINS when an order's payment is updated. */
export function buildAdminPaymentUpdateMessage(
  order: OrderDetail,
  detail: string,
  currencySymbol = "$"
): string {
  return (
    `💳 <b>Payment update</b> <code>${escapeHtml(order.orderNumber)}</code>\n\n` +
    `${escapeHtml(detail)}\n` +
    `Payment: ${statusLabel(order.paymentStatus)} · Total: ${currencySymbol}${Number(order.total).toFixed(2)}`
  );
}

/** Message to ADMINS when a customer sends an inbox message via Telegram. */
export function buildCustomerMessageNotification(
  customerName: string,
  body: string,
  replyHint: string
): string {
  return (
    `💬 <b>New message</b> from ${escapeHtml(customerName)}\n\n` +
    `${escapeHtml(body)}\n\n` +
    `↩️ ${replyHint}`
  );
}

/** Message to a CUSTOMER delivering an admin reply. */
export function buildAdminReplyMessage(adminName: string, body: string): string {
  return `📨 <b>Message from ${escapeHtml(adminName)}</b>\n\n${escapeHtml(body)}`;
}

// ========================
// Admin order actions
// ========================

export interface OrderStatusAction {
  key: string;
  label: string;
  status: string;
}

export const ORDER_STATUS_ACTIONS: Record<string, OrderStatusAction> = {
  confirm: { key: "confirm", label: "✅ Confirm", status: "CONFIRMED" },
  ready: { key: "ready", label: "📦 Ready for pickup", status: "READY_FOR_PICKUP" },
  pickedup: { key: "pickedup", label: "🤝 Picked up", status: "PICKED_UP" },
  cancel: { key: "cancel", label: "❌ Cancel", status: "CANCELLED" },
};

/**
 * Inline action buttons for an order, based on its current status.
 * callback_data format: `ord:<actionKey>:<orderNumber>`
 */
export function buildAdminOrderButtons(orderNumber: string, currentStatus: string): TelegramButton[] {
  const keys: string[] = [];
  switch (currentStatus) {
    case "PENDING":
      keys.push("confirm", "cancel");
      break;
    case "CONFIRMED":
      keys.push("ready", "cancel");
      break;
    case "READY_FOR_PICKUP":
      keys.push("pickedup");
      break;
    default:
      return [];
  }
  return keys.map((key) => ({
    text: ORDER_STATUS_ACTIONS[key].label,
    callbackData: `ord:${key}:${orderNumber}`,
  }));
}

/** URL to an order in the admin dashboard. */
export function adminOrderUrl(orderNumber: string): string {
  return `${BASE_URL}/admin/orders?order=${encodeURIComponent(orderNumber)}`;
}

