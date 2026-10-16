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

const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramConfig {
  enabled: boolean;
  botToken: string | null;
  botUsername: string | null;
}

export interface TelegramButton {
  text: string;
  url: string;
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
          inline_keyboard: buttons.map((b) => [{ text: b.text, url: b.url }]),
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
 * Build the notification message for a given order status.
 */
export function buildOrderMessage(order: OrderNotificationData): string {
  const itemsSummary = order.items
    .slice(0, 5)
    .map((item) => `• ${item.name} ×${item.quantity} — ${item.price}`)
    .join("\n");
  const extraItems = order.items.length > 5
    ? `\n…and ${order.items.length - 5} more`
    : "";

  switch (order.status) {
    case "CONFIRMED":
      return (
        `🛒 <b>Order Confirmed</b>\n\n` +
        `Order <b>${order.orderNumber}</b> has been confirmed.\n\n` +
        `<b>Items:</b>\n${itemsSummary}${extraItems}\n\n` +
        `<b>Total:</b> ${order.total}\n` +
        `<b>Payment:</b> ${order.paymentMethod}`
      );
    case "READY_FOR_PICKUP":
      return (
        `📦 <b>Ready for Pickup!</b>\n\n` +
        `Your order <b>${order.orderNumber}</b> is ready for pickup.\n\n` +
        `📍 ${order.storeName}\n` +
        `${order.storeAddress}\n\n` +
        `Please bring your order number or a valid ID when you arrive.`
      );
    case "PICKED_UP":
      return (
        `✅ <b>Order Picked Up</b>\n\n` +
        `Thank you for shopping with us, ${order.customerFirstName}! ` +
        `Your order <b>${order.orderNumber}</b> has been marked as picked up.`
      );
    case "CANCELLED":
      return (
        `❌ <b>Order Cancelled</b>\n\n` +
        `Your order <b>${order.orderNumber}</b> has been cancelled.`
      );
    case "REJECTED":
      return (
        `❌ <b>Order Rejected</b>\n\n` +
        `Your order <b>${order.orderNumber}</b> was rejected.` +
        (order.rejectionReason ? `\n\n<b>Reason:</b> ${order.rejectionReason}` : "")
      );
    default:
      return (
        `ℹ️ Your order <b>${order.orderNumber}</b> is currently: ${order.status.replace(/_/g, " ").toLowerCase()}.`
      );
  }
}

/**
 * Build the "View Order" inline button for a message.
 */
export function buildOrderButtons(orderNumber: string): TelegramButton[] {
  return [{ text: "View Order Details", url: `${BASE_URL}/orders/${orderNumber}` }];
}

/**
 * Build a help message listing the commands the bot understands.
 */
export function buildHelpMessage(storeName: string, forAdmin = false): string {
  let msg =
    `🤖 <b>${storeName}</b> assistant\n\n` +
    `Here's what I can do:\n` +
    `/orders — ${forAdmin ? "recent orders across the store" : "your recent orders and their status"}\n` +
    `/help — show this message`;

  if (forAdmin) {
    msg += `\n/order <order number> — status of any order (admin)`;
  }

  msg += `\n\nOrder updates (confirmed, ready for pickup, and more) are sent here automatically.`;
  return msg;
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
    return `• <code>${order.orderNumber}</code>\n  ${status} — ${currencySymbol}${Number(order.total).toFixed(2)} · ${date}`;
  });
  return `📦 <b>${heading}</b>\n\n${lines.join("\n\n")}`;
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

  const lines = [`📦 <b>${order.orderNumber}</b>`, ""];
  if (opts.forAdmin && order.customerFirstName) {
    lines.push(`Customer: ${order.customerFirstName}`);
  }
  lines.push(`Status: <b>${order.status.replace(/_/g, " ").toLowerCase()}</b>`);
  lines.push(`Payment: ${order.paymentStatus.replace(/_/g, " ").toLowerCase()}`);
  lines.push(`Total: ${money(order.total)}`);
  lines.push(`Placed: ${fmtDate(order.createdAt)}`);

  const items = order.items ?? [];
  if (items.length > 0) {
    lines.push("", "<b>Items:</b>");
    for (const item of items.slice(0, 5)) {
      lines.push(`• ${item.productName} ×${item.quantity} — ${money(item.productPrice)}`);
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

    const message = buildOrderMessage({
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
    });

    const ok = await sendTelegramMessage({
      token: config.botToken,
      chatId,
      text: message,
      buttons: buildOrderButtons(order.orderNumber),
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
