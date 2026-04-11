"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { formatDateTime } from "@/lib/utils";
import { Clock, Package, CheckCircle, Lock } from "lucide-react";
import type { Order } from "@/types";

/**
 * Pickup status page — track your order pickup.
 *
 * Customers use this to see:
 * - Their pending pickups
 * - Readiness status
 * - Pickup time slots
 * - Directions/location
 *
 * Requires authentication - unauthenticated users see a login prompt.
 */
export default function PickupPage() {
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
          headers: { Accept: "application/json" },
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
        // Filter to orders with pickup that are not picked up
        const allOrders: Order[] = data.data || [];
        const pickupOrders = allOrders.filter(
          (o: Order) =>
            o.status !== "PICKED_UP" &&
            o.status !== "CANCELLED" &&
            o.pickupSlot
        );
        setOrders(pickupOrders);
      } catch (error) {
        console.error("Failed to load orders:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, []);

  const statusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="w-5 h-5" />,
    CONFIRMED: <Clock className="w-5 h-5" />,
    READY_FOR_PICKUP: <Package className="w-5 h-5" />,
    PICKED_UP: <CheckCircle className="w-5 h-5" />,
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Pending Confirmation",
    CONFIRMED: "Confirmed",
    READY_FOR_PICKUP: "Ready for Pickup",
    PICKED_UP: "Picked Up",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Pickups</h1>
          <p className="text-gray-500">
            Track your order pickups and find pickup locations.
          </p>
        </div>

        {/* Authentication check - show login prompt if not authenticated */}
        {isAuthenticated === false && (
          <div className="text-center py-16">
            <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sign in to view your pickups
            </h2>
            <p className="text-gray-500 mb-6">
              Please sign in to view your order pickup status.
            </p>
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
          </div>
        )}

        {/* Loading state */}
        {isLoading && isAuthenticated !== false && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-gray-200 h-32" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No pending pickups
            </h2>
            <p className="text-gray-500 mb-6">
              You don&apos;t have any orders waiting for pickup.
            </p>
            <Link href="/" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const slot = order.pickupSlot;
              return (
                <div key={order.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""} •{" "}
                        {order.total}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        order.status === "READY_FOR_PICKUP"
                          ? "badge-success"
                          : "badge-info"
                      }`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>

                  {slot && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-primary-600">
                          {statusIcons[order.status]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(slot.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {slot.startTime} - {slot.endTime}
                          </p>
                        </div>
                      </div>

                      {order.status === "READY_FOR_PICKUP" && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-green-600 font-medium">
                            ✓ Your order is ready for pickup!
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Please bring your order number when collecting your
                            items.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-4">
                    Ordered {formatDateTime(order.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}