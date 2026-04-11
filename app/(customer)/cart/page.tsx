"use client";

import { useState } from "react";
import { useCartStore, useHydratedCart } from "@/hooks/use-cart";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartItem } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

/**
 * Shopping cart page.
 *
 * Features:
 * - View all cart items with quantity controls
 * - Remove items
 * - See subtotal, tax, and total
 * - Proceed to checkout
 * - Empty cart state with CTA
 *
 * Uses useHydratedCart to prevent SSR hydration mismatches.
 */
export default function CartPage() {
  const { removeItem, updateQuantity, clearCart } = useCartStore();
  
  // Use hydration hook to prevent SSR mismatches
  const { hydrated, items } = useHydratedCart();

  // Show loading state until hydrated on client
  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="space-y-4 w-full max-w-md">
            <div className="animate-pulse rounded-xl bg-gray-200 h-24" />
            <div className="animate-pulse rounded-xl bg-gray-200 h-24" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const taxRate = 0.08; // 8% tax — configurable
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-500 mb-6">
              Browse our products and add items to your cart.
            </p>
            <Link href="/" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Shopping Cart ({items.length} item{items.length !== 1 ? "s" : ""})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))}

            <button
              onClick={() => {
                if (confirm("Clear all items from cart?")) clearCart();
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <CartSummary
              subtotal={subtotal}
              tax={tax}
              total={total}
              itemCount={items.length}
            />
            <Link href="/checkout" className="btn-primary w-full mt-4 py-3 text-base">
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
