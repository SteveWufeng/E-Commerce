/**
 * Logout API route — signs out the current user.
 *
 * POST /api/auth/logout
 *
 * Uses NextAuth signOut to clear the session cookie.
 * Redirects to the home page after sign-out.
 */
import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Read callback URL from request body if provided
    const body = await request.json().catch(() => ({}));
    const callbackUrl = body.callbackUrl || "/";

    await signOut({ redirect: false });

    return NextResponse.json({ success: true, callbackUrl });
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { error: "Failed to sign out" },
      { status: 500 }
    );
  }
}
