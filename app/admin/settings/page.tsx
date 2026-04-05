"use client";

import { AdminLayout } from "@/components/admin/admin-layout";

/**
 * Admin settings page — store configuration.
 *
 * Features:
 * - Store name and address
 * - Tax rate configuration
 * - Notification settings (email, SMS)
 * - Payment method toggles
 * - Admin password change
 */
export default function AdminSettingsPage() {
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
                defaultValue={process.env.NEXT_PUBLIC_STORE_NAME || ""}
              />
            </div>
            <div>
              <label className="label">Store Address</label>
              <input
                type="text"
                className="input"
                defaultValue={process.env.NEXT_PUBLIC_STORE_ADDRESS || ""}
              />
            </div>
            <button className="btn-primary">Save Changes</button>
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
              <input type="number" className="input" defaultValue={8} step={0.1} />
            </div>
            <button className="btn-primary">Save Tax Rate</button>
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
    </AdminLayout>
  );
}
