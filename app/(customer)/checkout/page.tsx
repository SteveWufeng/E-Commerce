"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/hooks/use-cart";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PickupScheduler } from "@/components/pickup/pickup-scheduler";
import { OrderSummary } from "@/components/checkout/order-summary";
import { formatCurrency } from "@/lib/utils";
import type { PickupSlot, PaymentMethod } from "@/types";

/**
 * Checkout page — the final step before order placement.
 *
 * Flow:
 * 1. Customer fills in their info (name, email, phone)
 *    - Authenticated users have their info pre-filled
 *    - Guest users enter info manually
 * 2. Selects a pickup slot
 * 3. Chooses a payment method
 * 4. Reviews order and confirms
 *
 * Guest checkout is fully supported — no login required.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();

  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CREDIT_CARD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);

  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items.length, router]);

  // Load available pickup slots and check for authenticated user
  useEffect(() => {
    async function loadData() {
      // Load pickup slots
      try {
        const slotsRes = await fetch("/api/pickup-slots?available=true");
        const slotsData = await slotsRes.json();
        setPickupSlots(slotsData.data || []);
      } catch {
        setError("Failed to load pickup slots. Please try again.");
      }

      // Try to pre-fill from authenticated session
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData?.user) {
          // Fetch full profile for phone number
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

  async function handleSubmit(formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes: string;
  }) {
    if (!selectedSlot) {
      setError("Please select a pickup time slot.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
          pickupSlotId: selectedSlot,
          subtotal,
          tax,
          total,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to place order");
      }

      // Clear cart and redirect to order confirmation
      clearCart();
      router.push(`/orders/${result.data.orderId}?orderNumber=${result.data.orderNumber}`);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

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

            {/* Pickup Scheduler */}
            <PickupScheduler
              slots={pickupSlots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
            />

            {/* Payment Method */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Method
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { value: "CREDIT_CARD", label: "Credit Card", icon: "💳" },
                    { value: "GOOGLE_PAY", label: "Google Pay", icon: "📱" },
                    { value: "PAYPAL", label: "PayPal", icon: "🅿️" },
                    { value: "CASH_ON_PICKUP", label: "Cash on Pickup", icon: "💵" },
                  ] as const
                ).map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === method.value
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
              {process.env.MOCK_PAYMENTS === "true" && (
                <p className="mt-3 text-xs text-amber-600">
                  ⚠️ Demo mode — payments are simulated. No real charges will be made.
                </p>
              )}
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
