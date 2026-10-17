/**
 * Telegram bot webhook handler.
 *
 * Receives Telegram updates via webhook and supports:
 *
 *   /start <token>   — link this chat to a store account (single-use deep link)
 *   /orders          — recent orders (own orders; store-wide for admins)
 *   /order <number>  — status of a specific order (own; any order for admins)
 *   /help            — show available commands
 *
 * Admin-only:
 *   /confirm <number>     — mark confirmed
 *   /ready <number>       — mark ready for pickup
 *   /pickedup <number>    — mark picked up
 *   /cancel <number>      — cancel the order
 *   /reject <number> <reason> — reject with a reason
 *   /reply <number> <msg> — send a message to the customer
 *
 * Admins can also tap inline buttons under an order card to change its status.
 * Any other free-text message from a linked customer is delivered to the store
 * inbox (the admin dashboard) and forwarded to the admins on Telegram.
 *
 * Order lookups are scoped to the caller's own chat id, so a user can only
 * ever see their own orders.
 *
 * Registers via: TELEGRAM_WEBHOOK_URL=<url> node scripts/set-telegram-webhook.mjs
 *
 * OPTIONAL security: if TELEGRAM_WEBHOOK_SECRET is set, Telegram includes it
 * in the X-Telegram-Bot-Api-Secret-Token header and we reject mismatches.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getTelegramConfig,
  sendTelegramMessage,
  sendTelegramToUser,
  answerCallbackQuery,
  notifyAdmins,
  buildHelpMessage,
  buildOrdersListMessage,
  buildOrderStatusMessage,
  buildAdminOrderButtons,
  buildCustomerMessageNotification,
  buildAdminReplyMessage,
  ORDER_STATUS_ACTIONS,
  STORE_BASE_URL,
  type TelegramButton,
} from "@/lib/telegram";
import { changeOrderStatus, type OrderStatusValue } from "@/lib/orders/status";

interface TelegramUpdate {
  update_id?: number;
  message?: {
    chat?: { id?: number };
    from?: { id?: number; first_name?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id?: number; first_name?: string };
    message?: { chat?: { id?: number } };
  };
  [key: string]: unknown;
}

type SendFn = (message: string, buttons?: TelegramButton[]) => Promise<void>;

interface LinkedUser {
  id: string;
  role: string;
  firstName: string | null;
}

const RECENT_ORDERS_LIMIT = 5;
const ADMIN_RECENT_ORDERS_LIMIT = 10;

const ORDER_CARD_SELECT = {
  orderNumber: true,
  status: true,
  paymentStatus: true,
  total: true,
  createdAt: true,
  userId: true,
  customerFirstName: true,
  items: { select: { productName: true, productPrice: true, quantity: true } },
} as const;

function parseCommand(
  text: string | undefined
): { command: string; args: string } | null {
  if (typeof text !== "string" || !text.startsWith("/")) return null;
  const firstToken = text.slice(1).split(/\s+/)[0];
  const command = firstToken.split("@")[0].toLowerCase();
  const args = text.slice(1 + firstToken.length).trim();
  return { command, args };
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== webhookSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const update: TelegramUpdate = await request.json();

    const config = await getTelegramConfig();
    const botToken = config.botToken;
    const settings = await db.settings.findFirst({
      select: { storeName: true, currencySymbol: true },
    });
    const currency = settings?.currencySymbol ?? "$";

    // ---- Inline button callbacks (admin order actions) ----
    if (update.callback_query) {
      const cq = update.callback_query;
      const cqChatId = cq.message?.chat?.id ?? cq.from?.id;
      if (!botToken || !cqChatId) {
        return NextResponse.json({ ok: true });
      }
      const send: SendFn = async (message, buttons) => {
        await sendTelegramMessage({
          token: botToken,
          chatId: String(cqChatId),
          text: message,
          buttons,
        });
      };
      await handleCallback(cq.id, cq.data ?? "", String(cqChatId), currency, send);
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    const send: SendFn = async (out, buttons) => {
      if (!botToken) return;
      await sendTelegramMessage({
        token: botToken,
        chatId: String(chatId),
        text: out,
        buttons,
      });
    };

    if (!botToken) {
      return NextResponse.json({ ok: true });
    }

    const linkedUser = await db.user.findFirst({
      where: { telegramChatId: String(chatId) },
      select: { id: true, role: true, firstName: true },
    });
    const isAdmin = linkedUser?.role === "ADMIN";

    const cmd = parseCommand(text);

    // ---- Free-text (non-command) messages ----
    if (!cmd) {
      if (typeof text === "string" && text.trim()) {
        await handleCustomerMessage(linkedUser, text.trim(), send);
      } else {
        await send("Send /help to see what I can do.");
      }
      return NextResponse.json({ ok: true });
    }

    switch (cmd.command) {
      case "start":
        return await handleStart(chatId, cmd.args, botToken, send);
      case "help":
        await send(buildHelpMessage(settings?.storeName ?? "Store", isAdmin));
        return NextResponse.json({ ok: true });
      case "orders":
        return await handleOrders(linkedUser, isAdmin, currency, send);
      case "order":
      case "status":
        return await handleOrder(linkedUser, cmd.args, currency, send);
      case "confirm":
      case "ready":
      case "pickedup":
      case "cancel":
      case "reject":
        return await handleAdminStatus(linkedUser, cmd.command, cmd.args, currency, send);
      case "reply":
        return await handleReply(linkedUser, cmd.args, send);
      default:
        await send("I don't know that command. Send /help to see what I can do.");
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[Telegram] webhook error:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

async function handleStart(
  chatId: number,
  token: string,
  botToken: string | null,
  send: SendFn
) {
  if (!token) {
    await send(
      "👋 To link this chat, open your store profile and tap “Link Telegram Account”, then press the link it gives you."
    );
    return NextResponse.json({ ok: true });
  }

  const linkToken = await db.telegramLinkToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!linkToken || linkToken.usedAt || linkToken.expiresAt < new Date()) {
    await send("❌ This link is invalid or has expired. Please request a new one from your profile.");
    return NextResponse.json({ ok: true });
  }

  await db.$transaction([
    db.telegramLinkToken.update({
      where: { id: linkToken.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: linkToken.userId },
      data: { telegramChatId: String(chatId), telegramOptIn: true },
    }),
  ]);

  if (botToken) {
    await send(
      `✅ <b>Telegram linked!</b>\n\n` +
        `You'll now receive order updates here, ${linkToken.user.firstName}.\n` +
        `Try /orders to see your recent orders.`
    );
  }

  return NextResponse.json({ ok: true });
}

async function handleOrders(
  user: LinkedUser | null,
  isAdmin: boolean,
  currencySymbol: string,
  send: SendFn
) {
  if (!user) {
    await send(
      "You haven't linked your Telegram yet. Open your store profile, tap “Link Telegram Account”, then press the link it gives you."
    );
    return NextResponse.json({ ok: true });
  }

  const orders = await db.order.findMany({
    where: isAdmin ? {} : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: isAdmin ? ADMIN_RECENT_ORDERS_LIMIT : RECENT_ORDERS_LIMIT,
    select: { orderNumber: true, status: true, total: true, createdAt: true },
  });

  if (orders.length === 0) {
    await send(isAdmin ? "There are no orders in the store yet." : "You don't have any orders yet.");
    return NextResponse.json({ ok: true });
  }

  await send(buildOrdersListMessage(orders, currencySymbol, isAdmin ? "Recent orders" : "Your recent orders"));
  return NextResponse.json({ ok: true });
}

async function handleOrder(
  user: LinkedUser | null,
  orderNumberArg: string,
  currencySymbol: string,
  send: SendFn
) {
  if (!user) {
    await send(
      "You haven't linked your Telegram yet. Open your store profile, tap “Link Telegram Account”, then press the link it gives you."
    );
    return NextResponse.json({ ok: true });
  }

  const orderNumber = orderNumberArg.trim();
  if (!orderNumber) {
    await send("Usage: /order <order number>\nFor example: /order ORD-20260805-0001");
    return NextResponse.json({ ok: true });
  }

  const isAdmin = user.role === "ADMIN";
  const order = await db.order.findFirst({
    where: { orderNumber: { equals: orderNumber, mode: "insensitive" } },
    select: ORDER_CARD_SELECT,
  });

  if (!order) {
    await send("I couldn't find an order with that number.");
    return NextResponse.json({ ok: true });
  }

  if (!isAdmin && order.userId !== user.id) {
    await send("I couldn't find one of your orders with that number.");
    return NextResponse.json({ ok: true });
  }

  const buttons = isAdmin ? buildAdminOrderButtons(order.orderNumber, order.status) : undefined;
  await send(renderOrderCard(order, currencySymbol, isAdmin), buttons);
  return NextResponse.json({ ok: true });
}

async function handleCallback(
  callbackQueryId: string,
  data: string,
  chatId: string,
  currencySymbol: string,
  send: SendFn
) {
  const match = /^ord:([a-z]+):(.+)$/.exec(data);

  const admin = await db.user.findFirst({
    where: { telegramChatId: chatId, role: "ADMIN" },
    select: { id: true, firstName: true },
  });
  if (!admin || !match) {
    await answerCallbackQuery(callbackQueryId, "Not authorized");
    return;
  }

  const [, actionKey, orderNumber] = match;
  const action = ORDER_STATUS_ACTIONS[actionKey];
  if (!action) {
    await answerCallbackQuery(callbackQueryId, "Unknown action");
    return;
  }

  const order = await db.order.findFirst({
    where: { orderNumber: { equals: orderNumber, mode: "insensitive" } },
    select: { id: true, orderNumber: true },
  });
  if (!order) {
    await answerCallbackQuery(callbackQueryId, "Order not found");
    return;
  }

  const result = await changeOrderStatus({
    orderId: order.id,
    status: action.status as OrderStatusValue,
    actorType: "ADMIN",
  });

  if (!result.ok) {
    await answerCallbackQuery(callbackQueryId, result.error ?? "Failed");
    return;
  }

  await answerCallbackQuery(callbackQueryId, action.label.replace(/^[^\w]+/, ""));

  const fresh = await db.order.findFirst({
    where: { id: order.id },
    select: ORDER_CARD_SELECT,
  });
  if (fresh) {
    await send(
      `✅ <b>Updated</b> <code>${fresh.orderNumber}</code> → ${fresh.status.replace(/_/g, " ").toLowerCase()}`,
      buildAdminOrderButtons(fresh.orderNumber, fresh.status)
    );
  }
}

async function handleAdminStatus(
  user: LinkedUser | null,
  command: string,
  args: string,
  currencySymbol: string,
  send: SendFn
) {
  if (user?.role !== "ADMIN") {
    await send("This command is for store admins only.");
    return NextResponse.json({ ok: true });
  }

  const [orderNumberRaw, ...rest] = args.split(/\s+/);
  const orderNumber = orderNumberRaw?.trim();
  const reason = rest.join(" ").trim();

  if (!orderNumber) {
    await send(`Usage: /${command} <order number>${command === "reject" ? " <reason>" : ""}`);
    return NextResponse.json({ ok: true });
  }

  if (command === "reject" && !reason) {
    await send("Usage: /reject <order number> <reason>");
    return NextResponse.json({ ok: true });
  }

  const order = await db.order.findFirst({
    where: { orderNumber: { equals: orderNumber, mode: "insensitive" } },
    select: { id: true, orderNumber: true },
  });
  if (!order) {
    await send("I couldn't find an order with that number.");
    return NextResponse.json({ ok: true });
  }

  const action = ORDER_STATUS_ACTIONS[command];
  const status: OrderStatusValue = command === "reject" ? "REJECTED" : (action.status as OrderStatusValue);

  const result = await changeOrderStatus({
    orderId: order.id,
    status,
    rejectionReason: command === "reject" ? reason : undefined,
    actorType: "ADMIN",
  });

  if (!result.ok) {
    await send(`⚠️ ${result.error}`);
    return NextResponse.json({ ok: true });
  }

  const fresh = await db.order.findFirst({
    where: { id: order.id },
    select: ORDER_CARD_SELECT,
  });
  if (fresh) {
    await send(
      `✅ <code>${fresh.orderNumber}</code> → ${fresh.status.replace(/_/g, " ").toLowerCase()}`,
      buildAdminOrderButtons(fresh.orderNumber, fresh.status)
    );
  }
  return NextResponse.json({ ok: true });
}

async function handleReply(user: LinkedUser | null, args: string, send: SendFn) {
  if (user?.role !== "ADMIN") {
    await send("This command is for store admins only.");
    return NextResponse.json({ ok: true });
  }

  const [orderNumberRaw, ...rest] = args.split(/\s+/);
  const orderNumber = orderNumberRaw?.trim();
  const body = rest.join(" ").trim();

  if (!orderNumber || !body) {
    await send("Usage: /reply <order number> <message>");
    return NextResponse.json({ ok: true });
  }

  const order = await db.order.findFirst({
    where: { orderNumber: { equals: orderNumber, mode: "insensitive" } },
    select: { id: true, orderNumber: true, userId: true },
  });

  if (!order) {
    await send("I couldn't find an order with that number.");
    return NextResponse.json({ ok: true });
  }
  if (!order.userId) {
    await send("That order isn't linked to an account, so there's nowhere to send the reply.");
    return NextResponse.json({ ok: true });
  }

  await db.message.create({
    data: {
      userId: order.userId,
      orderId: order.id,
      sender: "ADMIN",
      body,
      readByAdmin: true,
      readByUser: false,
    },
  });

  const delivered = await sendTelegramToUser(
    order.userId,
    buildAdminReplyMessage(user.firstName ?? "Store team", body)
  );

  await send(
    delivered
      ? "✅ Reply sent to the customer."
      : "Saved to the inbox, but the customer isn't reachable on Telegram."
  );
  return NextResponse.json({ ok: true });
}

async function handleCustomerMessage(
  user: LinkedUser | null,
  text: string,
  send: SendFn
) {
  if (!user) {
    await send(
      "You haven't linked your Telegram yet. Open your store profile, tap “Link Telegram Account”, then press the link it gives you — then you can message us here."
    );
    return;
  }

  if (user.role === "ADMIN") {
    await send("Send /help to see the admin commands.");
    return;
  }

  const full = await db.user.findUnique({
    where: { id: user.id },
    select: { firstName: true, lastName: true, email: true },
  });
  const name = [full?.firstName, full?.lastName].filter(Boolean).join(" ") || full?.email || "Customer";

  await db.message.create({
    data: { userId: user.id, sender: "CUSTOMER", body: text },
  });

  await notifyAdmins(
    buildCustomerMessageNotification(
      name,
      text,
      `Reply in the dashboard: ${STORE_BASE_URL}/admin/messages`
    )
  );

  await send("✅ Sent to the store team. They'll reply here.");
}

function renderOrderCard(
  order: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: unknown;
    createdAt: Date;
    customerFirstName: string | null;
    items: { productName: string; productPrice: unknown; quantity: number }[];
  },
  currencySymbol: string,
  forAdmin: boolean
): string {
  return buildOrderStatusMessage(
    {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total as never,
      createdAt: order.createdAt,
      customerFirstName: order.customerFirstName ?? undefined,
      items: order.items as never,
    },
    { currencySymbol, forAdmin }
  );
}
