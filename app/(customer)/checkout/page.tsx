"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/hooks/use-cart";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { formatCurrency } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import Image from "next/image";

/**
 * Checkout page — bank transfer only.
 *
 * Flow:
 * 1. Customer fills in their info (name, email, phone)
 *    - Authenticated users have their info pre-filled
 *    - Guest users enter info manually
 * 2. Reviews order and confirms
 * 3. After placing order, customer uploads receipt image
 */
export default function CheckoutPage() {
  const { t } = useLocale();
  const router = useRouter();
  const items = useCartStore((state) => state.items);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const clearCart = useCartStore((state) => state.clearCart);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items.length, router]);

  // Pre-fill for authenticated users
  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData?.user) {
          const profileRes = await fetch("/api/auth/me");
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            const profile = profileData.data;
            setPrefillData({
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email,
              phone: profile.phone || "",
            });
          }
        }
      } catch {
        // Not authenticated — guest checkout
      }
    }
    loadData();
  }, []);

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes?: string;
  }) {
    const orderData = {
      ...formData,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      paymentMethod: "BANK_TRANSFER",
      subtotal: Math.max(0.01, subtotal),
      tax: Math.max(0, tax),
      total: Math.max(0.01, total),
    };

    setIsProcessing(true);
    setError(null);

    try {
      // Upload receipt first if selected
      let receiptImage: string | undefined;
      if (receiptFile) {
        const formData = new FormData();
        formData.append("file", receiptFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload receipt");
        receiptImage = uploadData.url;
      }

      // Create order — only include receiptImage if set
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptImage ? { ...orderData, receiptImage } : orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to place order");
      }

      // Clear cart and redirect to orders list
      clearCart();
      router.push("/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("proceedToCheckout")}</h1>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Info */}
            <CheckoutForm
              onSubmit={handleSubmit}
              isProcessing={isProcessing}
              prefillData={prefillData}
            />

            {/* Payment Method — Bank Transfer Only */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("paymentMethod")}
              </h2>
              <div className="p-4 rounded-lg border-2 border-primary-500 bg-primary-50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏦</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t("bankTransfer")}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("payViaBankTransfer")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt Upload */}
              <div className="mt-4">
                <label className="label">{t("uploadReceiptOptional")}</label>
                <div className="mt-2 flex items-center gap-4">
                  <label className="cursor-pointer btn-secondary text-sm py-2 px-4 rounded-lg">
                    {t("chooseFile")}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>
                  {receiptFile && (
                    <span className="text-sm text-gray-600">{receiptFile.name}</span>
                  )}
                </div>
                {receiptPreview && (
                  <div className="mt-3 relative w-32 h-32 rounded-lg overflow-hidden border">
                    <Image
                      src={receiptPreview}
                      alt={t("uploadReceipt")}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                {receiptPreview && (
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                    className="mt-2 text-xs text-red-600 hover:underline"
                  >
                    {t("remove")}
                  </button>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {t("uploadLaterHint")}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              items={items}
              subtotal={subtotal}
              tax={tax}
              total={total}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
