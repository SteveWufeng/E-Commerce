/**
 * Register the Telegram bot webhook.
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
    allowed_updates: ["message"],
  });
  console.log("Webhook registered:", data.result, "->", url);
}
