/**
 * Register the Telegram bot webhook and command menu.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook node scripts/set-telegram-webhook.mjs
 *
 * Optionally set TELEGRAM_WEBHOOK_SECRET for a secret-token header check.
 * To clear the webhook:  node scripts/set-telegram-webhook.mjs --delete
 */

const TELEGRAM_API = "https://api.telegram.org";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

const isDelete = process.argv.includes("--delete");
const url = process.env.TELEGRAM_WEBHOOK_URL;

// Commands exposed in the Telegram "/" menu.
const COMMANDS = [
  { command: "orders", description: "Your recent orders (all orders for admins)" },
  { command: "order", description: "Status of a specific order" },
  { command: "help", description: "Show what I can do" },
  { command: "confirm", description: "Admin: mark an order confirmed" },
  { command: "ready", description: "Admin: mark an order ready for pickup" },
  { command: "pickedup", description: "Admin: mark an order picked up" },
  { command: "cancel", description: "Admin: cancel an order" },
  { command: "reject", description: "Admin: reject an order with a reason" },
  { command: "reply", description: "Admin: message that order's customer" },
];

async function call(method, body) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json();
  if (!res.ok || data.ok !== true) {
    console.error(`${method} failed:`, data.description || res.statusText);
    process.exit(1);
  }
  return data;
}

if (isDelete) {
  const data = await call("deleteWebhook", {});
  console.log("Webhook deleted:", data.result);
} else {
  if (!url) {
    console.error("TELEGRAM_WEBHOOK_URL is required to register a webhook");
    process.exit(1);
  }
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
  const data = await call("setWebhook", {
    url,
    ...(secretToken ? { secret_token: secretToken } : {}),
    // callback_query is required for inline buttons to work.
    allowed_updates: ["message", "callback_query"],
  });
  console.log("Webhook registered:", data.result, "->", url);

  const commands = await call("setMyCommands", { commands: COMMANDS });
  console.log("Commands registered:", commands.result, `(${COMMANDS.length})`);
}

