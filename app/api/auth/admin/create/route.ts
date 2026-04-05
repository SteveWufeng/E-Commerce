/**
 * Admin user creation API route.
 *
 * POST /api/auth/admin/create
 * Body: { email, password, firstName, lastName }
 *
 * Creates a user with ADMIN role.
 * This route is protected — only existing admins can create new admins.
 * Used during initial setup and for admin management.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const adminCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, "Admin password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const requesterRole = (session.user as { role?: string })?.role;
    if (requesterRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden — admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = adminCreateSchema.parse(body);

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with cost factor 12
    const passwordHash = await bcrypt.hash(validated.password, 12);

    // Create admin user
    const user = await db.user.create({
      data: {
        firstName: validated.firstName.trim(),
        lastName: validated.lastName.trim(),
        email: validated.email.toLowerCase(),
        passwordHash,
        role: "ADMIN",
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Admin creation API error:", error);
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}
