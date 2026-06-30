"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/admin-layout";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

export default function AdminOrdersPage() {
  const { t } = useLocale();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [proofRejectId, setProofRejectId] = useState<string | null>(null);
  const [proofRejectReason, setProofRejectReason] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/api/orders?limit=100");
        const data = await res.json();
        setOrders(data.data || []);
      } catch (error) {
        console.error("Failed to load orders:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, []);

  const filtered = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch =
      !search ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusColors: Record<string, string> = {
    PENDING: "badge-warning",
    CONFIRMED: "badge-info",
    READY_FOR_PICKUP: "badge-success",
    PICKED_UP: "badge-success",
    CANCELLED: "badge-danger",
    REJECTED: "badge-danger",
  };

  async function updateStatus(orderId: string, newStatus: string, extra?: Record<string, string>) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updated.data : o))
        );
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  }

  async function handleReject() {
    if (!rejectOrderId || !rejectReason.trim()) return;
    await updateStatus(rejectOrderId, "REJECTED", { rejectionReason: rejectReason.trim() });
    setRejectOrderId(null);
    setRejectReason("");
  }

  async function refreshOrders() {
    const res = await fetch("/api/orders?limit=100");
    const data = await res.json();
    setOrders(data.data || []);
    setSelectedOrder(data.data?.find((o: any) => o.id === selectedOrder?.id) || null);
  }

  async function handleProofReject() {
    if (!proofRejectId || !proofRejectReason.trim()) return;
    await fetch(`/api/admin/proofs/${proofRejectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED", rejectionReason: proofRejectReason.trim() }),
    });
    setProofRejectId(null);
    setProofRejectReason("");
    await refreshOrders();
  }

  async function undoOrder(orderId: string) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const undoMap: Record<string, string> = {
      PICKED_UP: "READY_FOR_PICKUP",
      READY_FOR_PICKUP: "CONFIRMED",
      CONFIRMED: "PENDING",
      CANCELLED: "PENDING",
      REJECTED: "CONFIRMED",
    };
    
    const newStatus = undoMap[order.status];
    if (newStatus) {
      await updateStatus(orderId, newStatus);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("orders")}</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchProductsPlaceholder")}
          className="input max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input max-w-xs"
        >
          <option value="all">{t("allStatuses")}</option>
          <option value="PENDING">{t("status")}</option>
          <option value="CONFIRMED">{t("confirmOrder")}</option>
          <option value="READY_FOR_PICKUP">{t("pickupReady")}</option>
          <option value="PICKED_UP">{t("pickedUp")}</option>
          <option value="REJECTED">{t("reject")}</option>
          <option value="CANCELLED">{t("cancel")}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-gray-200 h-20" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("orderHash")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("customerName")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("totalLabel")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("status")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("date")}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} className={`border-b border-gray-100 hover:bg-gray-50 ${order.status === "REJECTED" ? "bg-red-50" : ""}`}>
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">
                        {order.customerFirstName} {order.customerLastName}
                      </div>
                      <div className="text-gray-500 text-xs">{order.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-medium">{formatCurrency(order.total)}</td>
                    <td className="py-3 px-4">
                  <span className={`badge ${statusColors[order.status] || "badge-info"}`}>
                    {order.status.toLowerCase().replace(/_/g, " ")}
                  </span>
                  {order.receiptImage && (
                    <span className="ml-1 text-xs text-green-600" title="Receipt uploaded">📎</span>
                  )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {order.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => updateStatus(order.id, "CONFIRMED")}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            {t("confirmOrder")}
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, "CANCELLED")}
                            className="ml-2 text-xs py-1.5 px-3 text-red-600 hover:text-red-700"
                          >
                            {t("cancel")}
                          </button>
                        </>
                      )}
                      {order.status === "CONFIRMED" && (
                        <>
                          <button
                            onClick={() => updateStatus(order.id, "READY_FOR_PICKUP")}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            {t("pickupReady")}
                          </button>
                          <button
                            onClick={() => setRejectOrderId(order.id)}
                            className="ml-2 text-xs py-1.5 px-3 text-red-600 hover:text-red-700 border border-red-300 rounded-lg"
                          >
                            {t("reject")}
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, "CANCELLED")}
                            className="ml-2 text-xs py-1.5 px-3 text-gray-500 hover:text-gray-700"
                          >
                            {t("cancel")}
                          </button>
                        </>
                      )}
                      {order.status === "READY_FOR_PICKUP" && (
                        <>
                          <button
                            onClick={() => updateStatus(order.id, "PICKED_UP")}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            {t("pickedUp")}
                          </button>
                          <button
                            onClick={() => undoOrder(order.id)}
                            className="ml-2 text-xs py-1.5 px-3 text-gray-500 hover:text-gray-700"
                          >
                            {t("restore")}
                          </button>
                        </>
                      )}
                      {order.status === "PICKED_UP" && (
                        <button
                          onClick={() => undoOrder(order.id)}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          {t("restore")}
                        </button>
                      )}
                      {order.status === "REJECTED" && (
                        <>
                          <button
                            onClick={() => undoOrder(order.id)}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            {t("restore")}
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, "CANCELLED")}
                            className="ml-2 text-xs py-1.5 px-3 text-red-600 hover:text-red-700"
                          >
                            {t("cancel")}
                          </button>
                        </>
                      )}
                      {order.status === "CANCELLED" && (
                        <button
                          onClick={() => undoOrder(order.id)}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          {t("restore")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">{t("noOrdersYet2")}</div>
          )}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectOrderId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-2">{t("rejectionReasonLabel")}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {t("reject")}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="input w-full resize-none"
              placeholder="The receipt image is unclear. Please upload a clearer image of the bank transfer confirmation."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRejectOrderId(null); setRejectReason(""); }}
                className="btn-secondary text-sm py-2 px-4"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="btn-primary text-sm py-2 px-4 bg-red-600 hover:bg-red-700"
              >
                {t("reject")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t("orderDetail")}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded hover:bg-gray-100">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">{t("orderHash")}</p>
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t("status")}</p>
                  <span className={`badge ${statusColors[selectedOrder.status] || "badge-info"}`}>
                    {selectedOrder.status.toLowerCase().replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">{t("customerName")}</p>
                  <p className="font-medium">{selectedOrder.customerFirstName} {selectedOrder.customerLastName}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t("customerEmail")}</p>
                  <p className="font-medium">{selectedOrder.customerEmail}</p>
                </div>
                {selectedOrder.customerPhone && (
                  <div>
                    <p className="text-gray-500">{t("phone")}</p>
                    <p className="font-medium">{selectedOrder.customerPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">{t("paymentMethods")}</p>
                  <p className="font-medium">{selectedOrder.paymentMethod.replace(/_/g, " ")} {selectedOrder.paymentStatus === "PENDING" ? "(Pending)" : "(Paid)"}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t("date")}</p>
                  <p className="font-medium">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
              </div>

              {selectedOrder.paymentProofs && selectedOrder.paymentProofs.length > 0 && selectedOrder.paymentProofs.map((proof: any) => (
                <div key={proof.id} className="border-t pt-4">
                  <p className="text-gray-500 text-sm mb-2">{t("proofDetails")}</p>
                  <div className="space-y-2 text-sm">
                    {proof.paymentMethodDefinition && (
                      <p><span className="text-gray-500">{t("paymentMethod")}:</span> {proof.paymentMethodDefinition.name}</p>
                    )}
                    {proof.transactionId && (
                      <p><span className="text-gray-500">{t("transactionId")}:</span> {proof.transactionId}</p>
                    )}
                    {proof.amount && (
                      <p><span className="text-gray-500">{t("totalLabel")}:</span> ${Number(proof.amount).toFixed(2)}</p>
                    )}
                    {proof.notes && (
                      <p><span className="text-gray-500">{t("proofNotes")}:</span> {proof.notes}</p>
                    )}
                    {proof.status && (
                      <p>
                        <span className="text-gray-500">{t("proofStatus")}:</span>{" "}
                        <span className={`badge ${proof.status === "VERIFIED" ? "badge-success" : proof.status === "REJECTED" ? "badge-danger" : "badge-warning"}`}>
                          {proof.status.toLowerCase()}
                        </span>
                      </p>
                    )}
                    {proof.imageUrl && (
                      <div>
                        <a
                          href={proof.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          {t("proofImage")} →
                        </a>
                      </div>
                    )}
                    {proof.rejectionReason && (
                      <div className="bg-red-50 rounded-lg p-3 mt-2">
                        <p className="text-red-600 text-xs font-medium">{t("rejectionReasonLabel")}</p>
                        <p className="text-sm">{proof.rejectionReason}</p>
                      </div>
                    )}
                    {proof.status === "PENDING" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async () => {
                            await fetch(`/api/admin/proofs/${proof.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "VERIFIED" }),
                            });
                            await refreshOrders();
                          }}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          {t("verify")}
                        </button>
                        <button
                          onClick={() => setProofRejectId(proof.id)}
                          className="text-xs py-1.5 px-3 text-red-600 hover:text-red-700 border border-red-300 rounded-lg"
                        >
                          {t("reject")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {selectedOrder.receiptImage && (
                <div className="border-t pt-4">
                  <p className="text-gray-500 text-sm mb-2">{t("receiptImage")}</p>
                  <a
                    href={selectedOrder.receiptImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-primary-600 hover:underline"
                  >
                    {t("receiptImage")} →
                  </a>
                </div>
              )}

              {selectedOrder.rejectionReason && (
                <div className="border-t pt-4">
                  <p className="text-red-600 text-sm font-medium mb-1">{t("rejectionReasonLabel")}</p>
                  <p className="text-sm bg-red-50 rounded-lg p-3">{selectedOrder.rejectionReason}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-gray-500 text-sm mb-2">{t("orderItems")}</p>
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between py-2 text-sm">
                    <span>{item.productName} x{item.quantity}</span>
                    <span className="font-medium">${Number(item.productPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t("subtotal")}</span>
                  <span>${selectedOrder.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t("tax")}</span>
                  <span>${selectedOrder.tax}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg mt-2">
                  <span>{t("totalLabel")}</span>
                  <span>${selectedOrder.total}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="border-t pt-4">
                  <p className="text-gray-500 text-sm">{t("orderNotes")}</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proof Rejection Modal */}
      {proofRejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-2">{t("rejectionReasonLabel")}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {t("reject")}
            </p>
            <textarea
              value={proofRejectReason}
              onChange={(e) => setProofRejectReason(e.target.value)}
              rows={4}
              className="input w-full resize-none"
              placeholder="The proof is invalid. Please submit a clearer image with the correct reference number."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setProofRejectId(null); setProofRejectReason(""); }}
                className="btn-secondary text-sm py-2 px-4"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleProofReject}
                disabled={!proofRejectReason.trim()}
                className="btn-primary text-sm py-2 px-4 bg-red-600 hover:bg-red-700"
              >
                {t("reject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
