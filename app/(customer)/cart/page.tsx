"use client";

import { useCartStore } from "@/hooks/use-cart";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartItem } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";
import { formatCurrency } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function CartPage() {
  const { t } = useLocale();
  const items = useCartStore((state) => state.items);
  const hydrated = useCartStore((state) => state.hydrated);
  const { removeItem, updateQuantity, clearCart } = useCartStore();

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">{t("loading")}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("yourCartIsEmpty")}
            </h2>
            <p className="text-gray-500 mb-6">
              {t("browseProductsAddToCart")}
            </p>
            <Link href="/" className="btn-primary">
              {t("startShopping")}
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
          {t("shoppingCart")} ({items.length} {items.length !== 1 ? t("items") : t("item")})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                if (confirm(t("clearCartConfirm"))) clearCart();
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              {t("clearCart")}
            </button>
          </div>

          <div className="lg:col-span-1">
            <CartSummary
              subtotal={subtotal}
              tax={tax}
              total={total}
              itemCount={items.length}
            />
            <Link href="/checkout" className="btn-primary w-full mt-4 py-3 text-base">
              {t("proceedToCheckout")}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
