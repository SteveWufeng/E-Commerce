/**
 * Telegram bot webhook handler.
 *
 * Receives Telegram updates via webhook. Handles the /start <token> command
 * that links a user's Telegram chat to their store account:
 *
 *   https://t.me/<BotUsername>?start=<singleUseToken>
 *
 * Registers the webhook with Telegram via:
 *   TELEGRAM_WEBHOOK_URL=<url> node scripts/set-telegram-webhook.mjs
 *
 * OPTIONAL security: if TELEGRAM_WEBHOOK_SECRET is set, Telegram includes it
 * in the X-Telegram-Bot-Api-Secret-Token header and we reject mismatches.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTelegramConfig, sendTelegramMessage } from "@/lib/telegram";

interface TelegramUpdate {
  update_id?: number;
  message?: {
    chat?: { id?: number };
    text?: string;
  };
  [key: string]: unknown;
}

function isValidToken(text: string | undefined): text is string {
  return typeof text === "string" && text.startsWith("/start ") && text.length > 8;
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

    if (!chatId || !isValidToken(text)) {
      return NextResponse.json({ ok: true });
    }

    const token = text.slice("/start ".length).trim();
    const linkToken = await db.telegramLinkToken.findUnique({
      where: { token },
      include: { user: true },
    });

    const config = await getTelegramConfig();
    const botToken = config.botToken;

    if (!linkToken || linkToken.usedAt || linkToken.expiresAt < new Date()) {
      if (botToken) {
        await sendTelegramMessage({
          token: botToken,
          chatId: String(chatId),
          text: "❌ This link is invalid or has expired. Please request a new one from your profile.",
        });
      }
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
      await sendTelegramMessage({
        token: botToken,
        chatId: String(chatId),
        text:
          `✅ <b>Telegram linked!</b>\n\n` +
          `You'll now receive order updates here, ${linkToken.user.firstName}.`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram] webhook error:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
