"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/hooks/use-cart";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { useLocale } from "@/hooks/use-locale";

type PaymentOption = "MERCANTIL" | "CUSTOM";
type CardType = "tdc" | "tdd";

interface PaymentMethodDefinition {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  qrCodeUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  proofType: string;
  proofLabel: string | null;
  proofImageRequired: boolean;
  requiresTransactionId: boolean;
}

interface CardFormData {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  customerId: string;
  cardType: CardType;
}

interface CheckoutData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  subtotal: number;
  tax: number;
  total: number;
}

export default function CheckoutPage() {
  const { t } = useLocale();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const hydrated = useCartStore((state) => state.hydrated);
  const clearCart = useCartStore((state) => state.clearCart);

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
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("MERCANTIL");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodDefinition | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDefinition[]>([]);
  const [transactionId, setTransactionId] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const [showingCard, setShowingCard] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [cardStep, setCardStep] = useState<"form" | "otp">("form");
  const [cardData, setCardData] = useState<CardFormData>({
    cardNumber: "",
    expirationDate: "",
    cvv: "",
    customerId: "",
    cardType: "tdc",
  });
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (hydrated && items.length === 0 && !showingCard) {
      router.push("/cart");
    }
  }, [hydrated, items.length, showingCard, router]);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionRes, settingsRes, methodsRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/settings"),
          fetch("/api/payment-methods"),
        ]);

        const settingsData = await settingsRes.json();
        if (settingsData.data) {
          if (settingsData.data.currencySymbol) {
            setCurrencySymbol(settingsData.data.currencySymbol);
          }
        }

        const methodsData = await methodsRes.json();
        if (methodsData.data) {
          setPaymentMethods(methodsData.data);
        }

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
        // silent
      }
    }
    loadData();
  }, []);

  function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onload = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleOrderSubmit(formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes?: string;
  }) {
    setError(null);

    if (paymentOption === "CUSTOM" && selectedMethod) {
      setIsProcessing(true);
      try {
        let proofImageUrl: string | undefined;
        if (proofFile) {
          const fd = new FormData();
          fd.append("file", proofFile);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload proof");
          proofImageUrl = uploadData.url;
        }

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            paymentMethod: selectedMethod.name,
            paymentMethodDefinitionId: selectedMethod.id,
            subtotal: Math.max(0.01, subtotal),
            tax: Math.max(0, tax),
            total: Math.max(0.01, total),
            ...(proofImageUrl ? { proofImageUrl } : {}),
            ...(transactionId ? { proofTransactionId: transactionId } : {}),
            ...(proofNotes ? { proofNotes } : {}),
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to place order");

        clearCart();
        const email = encodeURIComponent(formData.email);
        router.push(`/orders/${result.data.orderId}?orderNumber=${result.data.orderNumber}&email=${email}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setCheckoutData({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || "",
      notes: formData.notes,
      subtotal: Math.max(0.01, subtotal),
      tax: Math.max(0, tax),
      total: Math.max(0.01, total),
    });
    setShowingCard(true);
  }

  function cleanCardNumber(raw: string): string {
    return raw.replace(/\D/g, "");
  }

  function convertExpiry(raw: string): string {
    const cleaned = raw.replace(/[^0-9\/]/g, "");
    const parts = cleaned.split("/");
    if (parts.length === 2) {
      const month = parts[0].padStart(2, "0");
      const year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
      return `${year}/${month}`;
    }
    const match = cleaned.match(/^(\d{2})(\d{2,4})$/);
    if (match) {
      const month = match[1];
      const year = match[2].length === 2 ? `20${match[2]}` : match[2];
      return `${year}/${month}`;
    }
    return raw;
  }

  function cleanCustomerId(raw: string): string {
    return raw.trim().replace(/[\s-]+/g, "");
  }

  async function createOrderAfterPayment(transactionId: string, cardLastFour?: string) {
    if (!checkoutData) return;
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: checkoutData.firstName,
        lastName: checkoutData.lastName,
        email: checkoutData.email,
        phone: checkoutData.phone,
        notes: checkoutData.notes,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: "MERCANTIL",
        subtotal: checkoutData.subtotal,
        tax: checkoutData.tax,
        total: checkoutData.total,
        paymentTransactionId: transactionId,
        ...(cardLastFour ? { cardLastFour } : {}),
      }),
    });

    const orderResult = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(orderResult.error || "Failed to create order");
    }

    clearCart();
    router.push(`/orders/${orderResult.data.orderId}?orderNumber=${orderResult.data.orderNumber}`);
  }

  async function handleCardPay() {
    if (!checkoutData) return;
    setIsProcessing(true);
    setError(null);

    try {
      if (cardData.cardType === "tdc") {
        const invoiceNumber = `INV-${Date.now().toString(36)}`;
        const cleanedCard = cleanCardNumber(cardData.cardNumber);
        const cardLastFour = cleanedCard.slice(-4);
        const payRes = await fetch("/api/payments/mercantil/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardNumber: cleanedCard,
            expirationDate: convertExpiry(cardData.expirationDate),
            cvv: cardData.cvv,
            customerId: cleanCustomerId(cardData.customerId),
            paymentMethod: "tdc",
            amount: Number(checkoutData.total.toFixed(2)),
            currency: "ves",
            invoiceNumber,
          }),
        });

        const payResult = await payRes.json();
        if (!payRes.ok) {
          throw new Error(payResult.error || "Payment failed");
        }

        await createOrderAfterPayment(payResult.data?.transactionId, cardLastFour);
      } else {
        const cleanedCard = cleanCardNumber(cardData.cardNumber);
        const cardLastFour = cleanedCard.slice(-4);
        const authRes = await fetch("/api/payments/mercantil/getauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardNumber: cleanedCard,
            customerId: cleanCustomerId(cardData.customerId),
            paymentMethod: "tdd",
          }),
        });

        const authResult = await authRes.json();
        if (!authRes.ok) {
          throw new Error(authResult.error || "Failed to request OTP");
        }

        setCardStep("otp");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleOtpConfirm() {
    if (!checkoutData) return;
    setIsProcessing(true);
    setError(null);

    try {
      const invoiceNumber = `INV-${Date.now().toString(36)}`;
      const cleanedCard = cleanCardNumber(cardData.cardNumber);
      const cardLastFour = cleanedCard.slice(-4);
      const payRes = await fetch("/api/payments/mercantil/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNumber: cleanedCard,
          expirationDate: convertExpiry(cardData.expirationDate),
          cvv: cardData.cvv,
          customerId: cleanCustomerId(cardData.customerId),
          paymentMethod: "tdd",
          otp,
          amount: Number(checkoutData.total.toFixed(2)),
          currency: "ves",
          invoiceNumber,
        }),
      });

      const payResult = await payRes.json();
      if (!payRes.ok) {
        throw new Error(payResult.error || "Payment failed");
      }

      await createOrderAfterPayment(payResult.data?.transactionId, cardLastFour);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  }

  function hasProofRequired(method: PaymentMethodDefinition): boolean {
    return method.proofType !== "NONE";
  }

  if (items.length === 0 && !showingCard) return null;

  if (showingCard) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("proceedToCheckout")}</h1>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Card Payment
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Total: {currencySymbol}{(checkoutData?.total || total).toFixed(2)}
            </p>

            {cardStep === "form" && (
              <div className="space-y-4">
                <div>
                  <label className="label">Card Type</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cardType"
                        value="tdc"
                        checked={cardData.cardType === "tdc"}
                        onChange={() => setCardData({ ...cardData, cardType: "tdc" })}
                      />
                      Credit Card
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cardType"
                        value="tdd"
                        checked={cardData.cardType === "tdd"}
                        onChange={() => setCardData({ ...cardData, cardType: "tdd" })}
                      />
                      Debit Card
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label">Card Number</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="4532 3100 5303 2530"
                    value={cardData.cardNumber}
                    onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="12/25"
                      value={cardData.expirationDate}
                      onChange={(e) => setCardData({ ...cardData, expirationDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">CVV</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="924"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">National ID (Cédula / RIF)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="V-12345678 (your ID card number)"
                    value={cardData.customerId}
                    onChange={(e) => setCardData({ ...cardData, customerId: e.target.value })}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCardPay}
                  className="btn-primary w-full py-3 text-base"
                >
                  Pay {currencySymbol}{(checkoutData?.total || total).toFixed(2)}
                </button>
              </div>
            )}

            {cardStep === "otp" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  An OTP has been sent to your phone. Enter it below to confirm the payment.
                </p>
                <div>
                  <label className="label">OTP Code</label>
                  <input
                    type="text"
                    className="input text-2xl tracking-widest text-center"
                    placeholder="_ _ _ _ _ _"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOtpConfirm}
                  disabled={isProcessing || otp.length === 0}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            )}
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("proceedToCheckout")}</h1>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <CheckoutForm
              onSubmit={handleOrderSubmit}
              isProcessing={isProcessing}
              prefillData={prefillData}
            />

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("paymentMethod")}
              </h2>

              <div className="space-y-3">
                {/* Mercantil — always available */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    paymentOption === "MERCANTIL"
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentOption"
                    value="MERCANTIL"
                    checked={paymentOption === "MERCANTIL"}
                    onChange={() => {
                      setPaymentOption("MERCANTIL");
                      setSelectedMethod(null);
                    }}
                    className="accent-primary-500"
                  />
                  <span className="text-xl">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t("mercantilPayment")}</p>
                    <p className="text-xs text-gray-500 mt-1">Credit / Debit Card</p>
                  </div>
                </label>

                {/* Dynamic payment methods */}
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentOption === "CUSTOM" && selectedMethod?.id === method.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      value={method.id}
                      checked={paymentOption === "CUSTOM" && selectedMethod?.id === method.id}
                      onChange={() => {
                        setPaymentOption("CUSTOM");
                        setSelectedMethod(method);
                      }}
                      className="accent-primary-500"
                    />
                    {method.iconUrl ? (
                      <img src={method.iconUrl} alt={method.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-xl">🏦</span>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{method.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{method.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Proof submission for custom payment methods */}
              {paymentOption === "CUSTOM" && selectedMethod && hasProofRequired(selectedMethod) && (
                <div className="mt-4 space-y-4">
                  {selectedMethod.qrCodeUrl && (
                    <div className="flex justify-center">
                      <img
                        src={selectedMethod.qrCodeUrl}
                        alt={`${selectedMethod.name} QR`}
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                  )}

                  {selectedMethod.requiresTransactionId && (
                    <div>
                      <label className="label">{t("transactionId")}</label>
                      <input
                        type="text"
                        className="input"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction reference number"
                      />
                    </div>
                  )}

                  {(selectedMethod.proofType === "IMAGE" || selectedMethod.proofType === "IMAGE_AND_TEXT") && (
                    <div>
                      <label className="label">
                        {selectedMethod.proofLabel || t("uploadProof")}
                        {selectedMethod.proofImageRequired ? "" : ` (${t("uploadReceiptOptional")})`}
                      </label>
                      <div className="mt-2 flex items-center gap-4">
                        <label className="cursor-pointer btn-secondary text-sm py-2 px-4 rounded-lg">
                          {t("chooseFile")}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProofUpload}
                            className="hidden"
                          />
                        </label>
                        {proofFile && (
                          <span className="text-sm text-gray-600">{proofFile.name}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {(selectedMethod.proofType === "TEXT" || selectedMethod.proofType === "IMAGE_AND_TEXT") && (
                    <div>
                      <label className="label">{t("proofNotes")}</label>
                      <textarea
                        className="input resize-none"
                        rows={3}
                        value={proofNotes}
                        onChange={(e) => setProofNotes(e.target.value)}
                        placeholder="Enter payment reference or notes..."
                      />
                    </div>
                  )}

                  <p className="text-xs text-gray-400">{t("uploadLaterHint")}</p>
                </div>
              )}
            </div>
          </div>

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
