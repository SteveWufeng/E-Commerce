"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";

interface StoreSettings {
  storeName: string;
  storeAddress: string;
  taxRate: number;
  currencyCode: string;
  currencySymbol: string;
  conversionRate: number;
}

/**
 * Admin settings page — store configuration.
 *
 * Features:
 * - Store name and address
 * - Tax rate configuration
 * - Currency and conversion rate
 * - Notification settings (email, SMS)
 * - Payment method toggles
 * - Admin password change
 */
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: "",
    storeAddress: "",
    taxRate: 8,
    currencyCode: "USD",
    currencySymbol: "$",
    conversionRate: 1,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Store Information
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

        {/* Tax Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tax Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Tax Rate (%)</label>
              <input
                type="number"
                className="input"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                step={0.1}
                min={0}
                max={100}
              />
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Currency Settings
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
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Email Notifications
              </span>
              <span className="badge badge-success">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                SMS Notifications
              </span>
              <span className="badge badge-warning">Not Configured</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Methods
          </h2>
          <div className="space-y-3">
            {["Credit Card", "Google Pay", "PayPal", "Cash on Pickup"].map(
              (method) => (
                <label key={method} className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700">{method}</span>
                </label>
              )
            )}
          </div>
          <p className="mt-3 text-xs text-amber-600">
            ⚠️ Currently in mock payment mode. No real charges are processed.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? "Saving..." : saved ? "✓ Saved!" : "Save All Settings"}
        </button>
      </div>
    </AdminLayout>
  );
}
