/**
 * Products API — CRUD operations for the storefront and admin.
 *
 * GET    /api/products          — List/search products (public)
 * GET    /api/products/[id]     — Get single product (public)
 * POST   /api/products          — Create product (admin only)
 * PUT    /api/products/[id]     — Update product (admin only)
 * DELETE /api/products/[id]     — Delete product (admin only)
 * GET    /api/products/categories — List categories (public)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  sku: z.string().optional(),
  stock: z.number().int().min(0),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const sort = searchParams.get("sort") || "createdAt";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = { isActive: true };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { tags: { has: query } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (featured === "true") {
      where.isFeatured = true;
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: true },
        orderBy: { [sort]: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    const body = await request.json();
    const validated = productSchema.parse(body);

    const product = await db.product.create({
      data: {
        ...validated,
        slug: validated.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}
