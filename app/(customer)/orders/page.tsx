"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Lock } from "lucide-react";
import type { Order } from "@/types";

/**
 * Customer orders page — view order history and status.
 *
 * Features:
 * - List of all orders
 * - Order status badges
 * - Pickup details
 * - Order detail link
 *
 * Requires authentication - unauthenticated users see a login prompt.
 */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        // First check authentication status
        const sessionRes = await fetch("/api/auth/session", {
          credentials: "include",
        });
        const sessionData = await sessionRes.json();

        if (!sessionData?.user) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Now fetch orders - the API will only return the user's own orders
        const res = await fetch("/api/orders", {
          credentials: "include",
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
          throw new Error(`Failed to load orders: ${res.status}`);
        }
        
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

        {/* Authentication check - show login prompt if not authenticated */}
        {isAuthenticated === false && (
          <div className="text-center py-16">
            <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sign in to view your orders
            </h2>
            <p className="text-gray-500 mb-6">
              Please sign in to view your order history.
            </p>
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
          </div>
        )}

        {/* Loading state */}
        {isLoading && isAuthenticated !== false && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-gray-200 h-24" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.orderNumber}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(order.createdAt)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
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
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-4">No orders yet.</p>
            <Link href="/" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
