/**
 * Telegram bot webhook handler.
 *
 * Receives Telegram updates via webhook and supports a small set of bot
 * commands:
 *
 *   /start <token>  — link this chat to a store account (single-use deep link)
 *                     https://t.me/<BotUsername>?start=<singleUseToken>
 *   /orders         — recent orders (own orders; store-wide for admins)
 *   /order <number> — status of a specific order (own; any order for admins)
 *   /help           — show available commands
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
  buildHelpMessage,
  buildOrdersListMessage,
  buildOrderStatusMessage,
} from "@/lib/telegram";

interface TelegramUpdate {
  update_id?: number;
  message?: {
    chat?: { id?: number };
    text?: string;
  };
  [key: string]: unknown;
}

const RECENT_ORDERS_LIMIT = 5;
const ADMIN_RECENT_ORDERS_LIMIT = 10;

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
    const chatId = update.message?.chat?.id;
    const text = update.message?.text;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    const config = await getTelegramConfig();
    const botToken = config.botToken;
    const settings = await db.settings.findFirst({
      select: { storeName: true, currencySymbol: true },
    });

    const send = async (message: string) => {
      if (!botToken) return;
      await sendTelegramMessage({
        token: botToken,
        chatId: String(chatId),
        text: message,
      });
    };

    const cmd = parseCommand(text);

    if (!cmd) {
      await send("Send /help to see what I can do.");
      return NextResponse.json({ ok: true });
    }

    const linkedUser = await db.user.findFirst({
      where: { telegramChatId: String(chatId) },
      select: { id: true, role: true },
    });
    const isAdmin = linkedUser?.role === "ADMIN";
    const currency = settings?.currencySymbol ?? "$";

    switch (cmd.command) {
      case "start":
        return await handleStart(chatId, cmd.args, botToken, send);
      case "help":
        await send(buildHelpMessage(settings?.storeName ?? "Store", isAdmin));
        return NextResponse.json({ ok: true });
      case "orders":
        return await handleOrders(linkedUser, isAdmin, currency, send);
      case "order":
        return await handleOrder(linkedUser, cmd.args, currency, send);
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
  send: (message: string) => Promise<void>
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
  user: { id: string; role: string } | null,
  isAdmin: boolean,
  currencySymbol: string,
  send: (message: string) => Promise<void>
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
  user: { id: string; role: string } | null,
  orderNumberArg: string,
  currencySymbol: string,
  send: (message: string) => Promise<void>
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
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
      userId: true,
      customerFirstName: true,
      items: { select: { productName: true, productPrice: true, quantity: true } },
    },
  });

  if (!order) {
    await send("I couldn't find an order with that number.");
    return NextResponse.json({ ok: true });
  }

  if (!isAdmin && order.userId !== user.id) {
    await send("I couldn't find one of your orders with that number.");
    return NextResponse.json({ ok: true });
  }

  await send(
    buildOrderStatusMessage(
      {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        createdAt: order.createdAt,
        customerFirstName: order.customerFirstName,
        items: order.items,
      },
      { currencySymbol, forAdmin: isAdmin }
    )
  );
  return NextResponse.json({ ok: true });
}
