/**
 * Analytics Dashboard API — Admin-only endpoint for store metrics.
 *
 * GET /api/analytics/dashboard  — Get aggregated dashboard metrics
 * Query params:
 *   - from: ISO date string (start of range)
 *   - to: ISO date string (end of range)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const startDate = from ? new Date(from) : undefined;
    const endDate = to ? new Date(to) : undefined;

    const metrics = await getDashboardMetrics(startDate, endDate);

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}