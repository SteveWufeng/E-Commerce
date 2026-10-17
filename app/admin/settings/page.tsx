"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/admin-layout";
import { useLocale } from "@/hooks/use-locale";

interface StoreSettings {
  storeName: string;
  storeAddress: string;
  currencyCode: string;
  currencySymbol: string;
  conversionRate: number;
  mercantilRedirectEnabled: boolean;
  mercantilCardEnabled: boolean;
}

interface TelegramConfig {
  enabled: boolean;
  botUsername: string;
  hasBotToken: boolean;
}

/**
 * Admin settings page — store configuration.
 *
 * Features:
 * - Store name and address
 * - Currency and conversion rate
 * - Notification settings (email, SMS)
 * - Payment method toggles
 * - Admin password change
 */
export default function AdminSettingsPage() {
  const { t } = useLocale();
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: "",
    storeAddress: "",
    currencyCode: "USD",
    currencySymbol: "$",
    conversionRate: 1,
    mercantilRedirectEnabled: false,
    mercantilCardEnabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Telegram bot config state
  const [telegram, setTelegram] = useState<TelegramConfig>({
    enabled: false,
    botUsername: "",
    hasBotToken: false,
  });
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramMsg, setTelegramMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [telegramSaving, setTelegramSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setSettings(data.data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/admin/telegram")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setTelegram({
            enabled: data.data.enabled,
            botUsername: data.data.botUsername || "",
            hasBotToken: data.data.hasBotToken,
          });
        }
      })
      .catch(console.error);
  }, []);

  async function handleSaveTelegram() {
    setTelegramSaving(true);
    setTelegramMsg(null);
    try {
      const res = await fetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: telegram.enabled,
          botUsername: telegram.botUsername,
          botToken: telegramToken || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegram({
          enabled: data.data.enabled,
          botUsername: data.data.botUsername || "",
          hasBotToken: data.data.hasBotToken,
        });
        setTelegramToken("");
        setTelegramMsg({ ok: true, text: "Telegram settings saved!" });
      } else {
        setTelegramMsg({ ok: false, text: data.error || "Failed to save" });
      }
    } catch {
      setTelegramMsg({ ok: false, text: "Failed to save" });
    } finally {
      setTelegramSaving(false);
    }
  }

  async function handleTestTelegram() {
    setTelegramSaving(true);
    setTelegramMsg(null);
    try {
      const res = await fetch("/api/admin/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: telegramToken || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramMsg({ ok: true, text: `Connected! Bot: @${data.data.botUsername}` });
      } else {
        setTelegramMsg({ ok: false, text: data.error || "Connection failed" });
      }
    } catch {
      setTelegramMsg({ ok: false, text: "Connection failed" });
    } finally {
      setTelegramSaving(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("settings")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("storeInformation")}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Store Name</label>
              <input
                type="text"
                className="input"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                placeholder="My Store"
              />
            </div>
            <div>
              <label className="label">Store Address</label>
              <input
                type="text"
                className="input"
                value={settings.storeAddress}
                onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                placeholder="123 Main St"
              />
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("currencySettings")}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Currency Code</label>
                <input
                  type="text"
                  className="input"
                  value={settings.currencyCode}
                  onChange={(e) => setSettings({ ...settings, currencyCode: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="label">Symbol</label>
                <input
                  type="text"
                  className="input"
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  placeholder="$"
                  maxLength={3}
                />
              </div>
            </div>
            <div>
              <label className="label">Conversion Rate (1 USD = ?)</label>
              <input
                type="number"
                className="input"
                value={settings.conversionRate}
                onChange={(e) => setSettings({ ...settings, conversionRate: parseFloat(e.target.value) || 1 })}
                step={0.01}
                min={0.01}
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: If you set 1 USD = 150 JPY, enter 150
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("notifications")}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {t("customerEmail")}
              </span>
              <span className="badge badge-warning">{t("inactive")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                SMS Notifications
              </span>
              <span className="badge badge-warning">{t("inactive")}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("paymentMethods")}
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300">
              <div>
                <p className="text-sm font-medium text-gray-900">Credit / Debit Card (Mercantil)</p>
                <p className="text-xs text-gray-500">Show the card payment option at checkout</p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 accent-primary-500 rounded"
                checked={settings.mercantilCardEnabled}
                onChange={(e) => setSettings({ ...settings, mercantilCardEnabled: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300">
              <div>
                <p className="text-sm font-medium text-gray-900">Mercantil — Redirect Button (Legacy)</p>
                <p className="text-xs text-gray-500">Botón de Pagos Web redirect flow</p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 accent-primary-500 rounded"
                checked={settings.mercantilRedirectEnabled}
                onChange={(e) => setSettings({ ...settings, mercantilRedirectEnabled: e.target.checked })}
              />
            </label>
            <div className="p-3 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                <Link href="/admin/payment-methods" className="text-primary-600 hover:underline">
                  {t("paymentMethods")} →
                </Link>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Manage all payment methods including Bank Transfer from the payment methods section.
              </p>
            </div>
          </div>
        </div>

        {/* Telegram Notifications */}
        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Telegram Bot Notifications
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Send customers real-time order updates via Telegram. Credentials are encrypted at rest.
          </p>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300">
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Telegram notifications</p>
                <p className="text-xs text-gray-500">Store-wide toggle — when off, no messages are sent.</p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 accent-primary-500 rounded"
                checked={telegram.enabled}
                onChange={(e) => setTelegram({ ...telegram, enabled: e.target.checked })}
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Bot Token</label>
                <input
                  type="password"
                  className="input"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder={telegram.hasBotToken ? "•••••••••••••• (saved)" : "123456:ABC-DEF..."}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {telegram.hasBotToken
                    ? "A token is already saved. Leave blank to keep it."
                    : "Get one from @BotFather. Left blank, falls back to TELEGRAM_BOT_TOKEN env."}
                </p>
              </div>
              <div>
                <label className="label">Bot Username</label>
                <input
                  type="text"
                  className="input"
                  value={telegram.botUsername}
                  onChange={(e) => setTelegram({ ...telegram, botUsername: e.target.value })}
                  placeholder="@MyStoreBot"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to build customer linking links (e.g. t.me/MyStoreBot).
                </p>
              </div>
            </div>

            {telegramMsg && (
              <p className={`text-sm ${telegramMsg.ok ? "text-green-600" : "text-red-600"}`}>
                {telegramMsg.text}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={telegramSaving}
                className="btn-secondary"
              >
                {telegramSaving ? "Testing..." : "Test Connection"}
              </button>
              <button
                type="button"
                onClick={handleSaveTelegram}
                disabled={telegramSaving}
                className="btn-primary"
              >
                {telegramSaving ? "Saving..." : "Save Telegram Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? t("creating") : saved ? "✓ Saved!" : t("saveChanges")}
        </button>
      </div>
    </AdminLayout>
  );
}
