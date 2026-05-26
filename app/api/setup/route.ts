export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.SETUP_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: "SETUP_TOKEN environment variable is not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: "Invalid or missing setup token" },
      { status: 401 }
    );
  }

  try {
    const existing = await db.user.findUnique({
      where: { email: "admin@store.com" },
    });

    if (existing) {
      return NextResponse.json({
        message: "Admin user already exists",
        email: "admin@store.com",
      });
    }

    const passwordHash = await bcrypt.hash("admin123", 12);
    await db.user.create({
      data: {
        email: "admin@store.com",
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        isVerified: true,
      },
    });

    return NextResponse.json(
      {
        message: "Admin user created",
        email: "admin@store.com",
        note: "Change the password after first login",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Setup API error:", error);
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}
