"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import type { Order } from "@/types";

/**
 * Customer orders page — view order history and status.
 *
 * Features:
 * - List of all orders
 * - Order status badges
 * - Pickup details
 * - Order detail link
 */
export default function OrdersPage() {
  const { t } = useLocale();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/api/orders");
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

  const statusColors: Record<string, string> = {
    PENDING: "badge-warning",
    CONFIRMED: "badge-info",
    READY_FOR_PICKUP: "badge-success",
    PICKED_UP: "badge-success",
    CANCELLED: "badge-danger",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("myOrdersHeading")}</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-gray-200 h-24" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}?orderNumber=${order.orderNumber}`}
                className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-primary-300 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.orderNumber}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(order.createdAt)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.items.length} {order.items.length !== 1 ? t("items") : t("item")}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(order.total)}
                  </span>
                  <span className={`badge ${statusColors[order.status] || "badge-info"}`}>
                    {order.status.toLowerCase().replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-4">{t("noOrdersYet")}</p>
            <Link href="/" className="btn-primary">
              {t("startShopping")}
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
