"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import type { Order } from "@/types";

export default function OrderDetailPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id") || searchParams.get("orderNumber");
  const email = searchParams.get("email");
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofTransactionId, setProofTransactionId] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const isOwner = !!(currentUserEmail && order && currentUserEmail === order.customerEmail);
  const isCustomPayment = order?.paymentMethod !== "MERCANTIL";
  const latestProof = order?.paymentProofs?.[0] || null;

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setError("Order not found");
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (email) params.set("email", email);
        const res = await fetch(`/api/orders/${orderId}?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.data) {
          setError(data.error || "Order not found");
          return;
        }

        setOrder(data.data);
      } catch {
        setError("Failed to load order");
      } finally {
        setIsLoading(false);
      }
    }

    async function loadSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.data?.email) setCurrentUserEmail(data.data.email);
        }
      } catch {
        // Not logged in
      }
    }

    loadOrder();
    loadSession();
  }, [orderId, email]);

  async function handleUploadProof() {
    if (!proofFile || !order) return;

    setUploading(true);
    try {
      let imageUrl: string | undefined;
      if (proofFile) {
        const formData = new FormData();
        formData.append("file", proofFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload proof");
        imageUrl = uploadData.url;
      }

      const body: Record<string, any> = {
        orderId: order.id,
        paymentMethodDefinitionId: latestProof?.paymentMethodDefinitionId || order.paymentMethod,
      };
      if (imageUrl) body.imageUrl = imageUrl;
      if (proofTransactionId) body.transactionId = proofTransactionId;
      if (proofNotes) body.notes = proofNotes;

      const res = await fetch(`/api/proofs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save proof");

      setOrder((prev) => prev ? { ...prev, paymentProofs: data.data.paymentProofs } : prev);
      setProofFile(null);
      setProofPreview(null);
      setProofTransactionId("");
      setProofNotes("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload proof");
    } finally {
      setUploading(false);
    }
  }

  async function handleCancel() {
    if (!order || !isOwner) return;
    if (!confirm(t("cancelConfirm"))) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");

      setOrder(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: "badge-warning",
    CONFIRMED: "badge-info",
    READY_FOR_PICKUP: "badge-success",
    PICKED_UP: "badge-success",
    CANCELLED: "badge-danger",
    REJECTED: "badge-danger",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-4">{error || "Order not found"}</p>
            <Link href="/orders" className="btn-primary">Back to My Orders</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const proofStatus = latestProof?.status;
  const needsProof = isCustomPayment && (!latestProof || proofStatus === "REJECTED");
  const canSubmitProof = isOwner && needsProof;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Link href="/orders" className="text-primary-600 hover:underline mb-4 inline-block">
          ← {t("backToMyOrders")}
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t("orderDetails")}</h1>
          <span className={`badge ${statusColors[order.status] || "badge-info"}`}>
            {order.status.toLowerCase().replace(/_/g, " ")}
          </span>
        </div>

        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">{t("orderInformation")}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">{t("orderNumber")}</p>
              <p className="font-medium">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-gray-500">{t("orderDate")}</p>
              <p className="font-medium">{formatDateTime(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">{t("customerName")}</p>
              <p className="font-medium">{order.customerFirstName} {order.customerLastName}</p>
            </div>
            <div>
              <p className="text-gray-500">{t("email")}</p>
              <p className="font-medium">{order.customerEmail}</p>
            </div>
            {order.customerPhone && (
              <div>
                <p className="text-gray-500">{t("phone")}</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">{t("paymentMethod")}</p>
              <p className="font-medium">
                {latestProof?.paymentMethodDefinition?.name || order.paymentMethod.replace(/_/g, " ")}
              </p>
            </div>
            {order.cardLastFour && (
              <div>
                <p className="text-gray-500">Card ending in</p>
                <p className="font-medium">•••• {order.cardLastFour}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Notice — Custom payment method, not yet verified */}
        {isCustomPayment && !latestProof && order.status === "PENDING" && (
          <div className="card mb-6 border-2 border-amber-300 bg-amber-50">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🏦</span>
              <div>
                <h2 className="text-lg font-bold text-amber-800 mb-2">{t("paymentNoticeTitle")}</h2>
                <p className="text-sm text-amber-700 mb-2">{t("paymentNoticeDescription")}</p>
                <p className="text-sm text-amber-600">{t("paymentNoticeAction")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Proof Rejection Notice */}
        {latestProof?.status === "REJECTED" && latestProof.rejectionReason && (
          <div className="card mb-6 border-2 border-red-300 bg-red-50">
            <h2 className="text-lg font-semibold text-red-700 mb-2">{t("proofRejectedMessage")}</h2>
            <p className="text-sm text-red-600 mb-3">{latestProof.rejectionReason}</p>
            <p className="text-sm text-gray-600">
              {t("uploadReceiptPrompt")}
            </p>
          </div>
        )}

        {/* Proof Section — Custom payment methods, owner only */}
        {isCustomPayment && isOwner && (
          <div className={`card mb-6 ${latestProof?.status === "VERIFIED" ? "border-2 border-green-300 bg-green-50" : latestProof?.status === "REJECTED" ? "border-2 border-red-300 bg-red-50" : "border-2 border-dashed border-primary-300 bg-primary-50/50"}`}>
            <h2 className="text-lg font-semibold mb-2">
              {latestProof?.status === "VERIFIED"
                ? t("paymentProof")
                : latestProof?.status === "REJECTED"
                  ? t("updateProof")
                  : t("uploadProof")}
            </h2>

            {/* Show existing proof details */}
            {latestProof && (
              <div className="space-y-3 mb-4">
                {latestProof.paymentMethodDefinition?.qrCodeUrl && (
                  <div className="flex justify-center">
                    <img
                      src={latestProof.paymentMethodDefinition.qrCodeUrl}
                      alt="QR"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                )}
                {latestProof.imageUrl && (
                  <div className="relative w-full max-w-sm aspect-[4/3] rounded-lg overflow-hidden border">
                    <Image
                      src={latestProof.imageUrl}
                      alt="Payment proof"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                {latestProof.transactionId && (
                  <p className="text-sm"><span className="text-gray-500">{t("transactionId")}:</span> {latestProof.transactionId}</p>
                )}
                {latestProof.notes && (
                  <p className="text-sm"><span className="text-gray-500">{t("proofNotes")}:</span> {latestProof.notes}</p>
                )}
                {latestProof.status && (
                  <p className="text-sm">
                    <span className="text-gray-500">{t("proofStatus")}:</span>{" "}
                    <span className={`badge ${latestProof.status === "VERIFIED" ? "badge-success" : latestProof.status === "REJECTED" ? "badge-danger" : "badge-warning"}`}>
                      {latestProof.status.toLowerCase()}
                    </span>
                  </p>
                )}
              </div>
            )}

            {canSubmitProof && (
              <>
                {latestProof?.paymentMethodDefinition?.requiresTransactionId && (
                  <div className="mb-3">
                    <label className="label">{t("transactionId")}</label>
                    <input
                      type="text"
                      className="input"
                      value={proofTransactionId}
                      onChange={(e) => setProofTransactionId(e.target.value)}
                      placeholder="Reference number"
                    />
                  </div>
                )}

                {(!latestProof?.paymentMethodDefinition?.proofType || latestProof.paymentMethodDefinition.proofType === "IMAGE" || latestProof.paymentMethodDefinition.proofType === "IMAGE_AND_TEXT") && (
                  <div className="mb-3">
                    <label className="label">
                      {latestProof?.paymentMethodDefinition?.proofLabel || t("proofImage")}
                    </label>
                    <div className="mt-2 flex items-center gap-4">
                      <label className="cursor-pointer btn-secondary text-sm py-2 px-4 rounded-lg">
                        {t("chooseFile")}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setProofFile(file);
                              const reader = new FileReader();
                              reader.onload = () => setProofPreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      {proofFile && (
                        <span className="text-sm text-gray-600">{proofFile.name}</span>
                      )}
                    </div>
                  </div>
                )}

                {(latestProof?.paymentMethodDefinition?.proofType === "TEXT" || latestProof?.paymentMethodDefinition?.proofType === "IMAGE_AND_TEXT") && (
                  <div className="mb-3">
                    <label className="label">{t("proofNotes")}</label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      value={proofNotes}
                      onChange={(e) => setProofNotes(e.target.value)}
                      placeholder="Enter payment details..."
                    />
                  </div>
                )}

                <div className="flex items-center gap-4 flex-wrap">
                  {proofFile && (
                    <>
                      <button
                        onClick={handleUploadProof}
                        disabled={uploading}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        {uploading ? t("uploadReceiptButton") : latestProof ? t("updateProof") : t("uploadProof")}
                      </button>
                    </>
                  )}
                </div>
                {proofPreview && (
                  <div className="mt-3 relative w-48 h-48 rounded-lg overflow-hidden border">
                    <Image
                      src={proofPreview}
                      alt="Proof preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {/* Show proof for non-owners */}
        {latestProof?.imageUrl && !isOwner && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">{t("paymentProof")}</h2>
            <div className="relative w-full max-w-sm aspect-[4/3] rounded-lg overflow-hidden border">
              <Image
                src={latestProof.imageUrl}
                alt={t("paymentProof")}
                fill
                className="object-contain"
              />
            </div>
            {latestProof.status === "PENDING" && (
              <p className="mt-2 text-xs text-gray-400">{t("proofSubmittedAwaiting")}</p>
            )}
            {latestProof.status === "VERIFIED" && (
              <p className="mt-2 text-xs text-green-600">✓ {t("proofVerified")}</p>
            )}
          </div>
        )}

        {order.notes && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">{t("orderNotesHeading")}</h2>
            <p className="text-sm">{order.notes}</p>
          </div>
        )}

        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">{t("orderItems")}</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium">{formatCurrency(Number(item.productPrice) * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel button — owner only */}
        {isOwner && ["PENDING", "CONFIRMED"].includes(order.status) && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-danger text-sm py-2 px-6"
            >
              {cancelling ? t("cancelling") : t("cancelOrder")}
            </button>
          </div>
        )}

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("tax")}</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold text-lg">
              <span>{t("total")}</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
