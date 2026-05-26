/**
 * Settings API — Store configuration management.
 *
 * Uses Prisma/Settings model instead of filesystem so it works on
 * serverless deployment platforms (Railway, Cloudflare, etc.).
 *
 * GET /api/settings    — Get store settings
 * POST /api/settings   — Update store settings (admin only)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import db from "@/lib/db";

async function getOrCreateSettings() {
  let settings = await db.settings.findFirst();
  if (!settings) {
    settings = await db.settings.create({ data: {} });
  }
  return settings;
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings();
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
    const current = await getOrCreateSettings();

    const updated = await db.settings.update({
      where: { id: current.id },
      data: {
        storeName: body.storeName ?? current.storeName,
        storeAddress: body.storeAddress ?? current.storeAddress,
        taxRate: body.taxRate ?? current.taxRate,
        currencyCode: body.currencyCode ?? current.currencyCode,
        currencySymbol: body.currencySymbol ?? current.currencySymbol,
        conversionRate: body.conversionRate ?? current.conversionRate,
        pickupHours: body.pickupHours ?? current.pickupHours,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
