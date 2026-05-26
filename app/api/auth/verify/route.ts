export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyEmail } from "@/lib/auth/verification";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  const result = await verifyEmail(token);

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(result.error)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/login?verified=true", request.url));
}
