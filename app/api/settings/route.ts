/**
 * Settings API — Store configuration management.
 *
 * GET /api/settings    — Get store settings
 * POST /api/settings   — Update store settings (admin only)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import fs from "fs";
import path from "path";

const defaultSettings = {
  storeName: "My Store",
  storeAddress: "",
  taxRate: 8,
  currencyCode: "USD",
  currencySymbol: "$",
  conversionRate: 1,
};

const settingsFilePath = path.join(process.cwd(), "data", "settings.json");

function ensureSettingsFile() {
  const dir = path.dirname(settingsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(settingsFilePath)) {
    fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
  }
}

function getSettings() {
  ensureSettingsFile();
  const data = fs.readFileSync(settingsFilePath, "utf-8");
  return JSON.parse(data);
}

function saveSettings(settings: typeof defaultSettings) {
  ensureSettingsFile();
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
}

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin required" }, { status: 401 });
    }

    const body = await request.json();
    const currentSettings = getSettings();
    
    const newSettings = {
      storeName: body.storeName ?? currentSettings.storeName,
      storeAddress: body.storeAddress ?? currentSettings.storeAddress,
      taxRate: body.taxRate ?? currentSettings.taxRate,
      currencyCode: body.currencyCode ?? currentSettings.currencyCode,
      currencySymbol: body.currencySymbol ?? currentSettings.currencySymbol,
      conversionRate: body.conversionRate ?? currentSettings.conversionRate,
    };

    saveSettings(newSettings);
    return NextResponse.json({ success: true, data: newSettings });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}