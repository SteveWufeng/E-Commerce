export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Simple guest session id generator
function genSessionId() {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const cookies = request.cookies;

    if (session?.user) {
      const userId = (session.user as { id: string }).id;
      const cart = await db.cart.findUnique({
        where: { userId },
        include: { items: true },
      });
      return NextResponse.json({ success: true, data: cart || { items: [] } });
    }

    const cartSession = cookies.get("cart_session")?.value;
    if (cartSession) {
      const cart = await db.cart.findUnique({
        where: { sessionId: cartSession },
        include: { items: true },
      });
      return NextResponse.json({ success: true, data: cart || { items: [] } });
    }

    return NextResponse.json({ success: true, data: { items: [] } });
  } catch (error) {
    console.error("Cart GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load cart" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const items: Array<{ productId: string; quantity: number; optionId?: string | null }> =
      body.items || [];

    let cart;
    let setCookieHeader: string | undefined;

    if (session?.user) {
      const userId = (session.user as { id: string }).id;
      // Ensure a sessionId exists for the DB record (schema requires sessionId)
      const userSessionId = `user_${userId}`;
      cart = await db.cart.upsert({
        where: { userId },
        update: {},
        create: { userId, sessionId: userSessionId },
      });
    } else {
      // guest
      const cookies = request.cookies;
      const sessionId = cookies.get("cart_session")?.value || genSessionId();
      cart = await db.cart.upsert({
        where: { sessionId },
        update: {},
        create: { sessionId },
      });
      // Set cookie for future requests
      setCookieHeader = `cart_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? '; Secure' : ''}`;
    }

    // Merge items into cart (line key = cartId + productId + optionId)
    for (const it of items) {
      const optionId = it.optionId ?? null;
      const existing = optionId
        ? await db.cartItem.findFirst({
            where: { cartId: cart.id, productId: it.productId, optionId },
          })
        : await db.cartItem.findFirst({
            where: { cartId: cart.id, productId: it.productId, optionId: null },
          });

      if (existing) {
        await db.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + it.quantity },
        });
      } else {
        await db.cartItem.create({
          data: {
            cartId: cart.id,
            productId: it.productId,
            quantity: it.quantity,
            optionId,
          },
        });
      }
    }

    const updated = await db.cart.findUnique({ where: { id: cart.id }, include: { items: true } });

    // Enrich items with product details
    const productIds = (updated?.items || []).map((i) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: { options: true },
    });
    const pmap: Record<string, any> = {};
    for (const p of products) pmap[p.id] = p;

    const enriched = (updated?.items || []).map((it) => {
      const p = pmap[it.productId];
      const opt = it.optionId ? p?.options?.find((o: any) => o.id === it.optionId) : null;
      const unitPrice = opt
        ? opt.priceMode === "CUSTOM_TOTAL" && opt.totalPrice != null
          ? Number(opt.totalPrice)
          : opt.quantity * Number(p?.price || 0)
        : p
          ? Number(p.price)
          : 0;
      return {
        productId: it.productId,
        quantity: it.quantity,
        name: p?.name || "",
        price: unitPrice,
        image: p?.images?.[0] || "",
        maxStock: opt ? Math.floor((p?.stock || 0) / opt.quantity) : p?.stock || 0,
        optionId: it.optionId || null,
        optionLabel: opt?.label || null,
        unitsPerOption: opt ? opt.quantity : 1,
      };
    });

    const res = NextResponse.json({ success: true, data: { id: updated?.id, items: enriched } });
    if (setCookieHeader) res.headers.set("Set-Cookie", setCookieHeader);
    return res;
  } catch (error) {
    console.error("Cart POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to update cart" }, { status: 500 });
  }
}
