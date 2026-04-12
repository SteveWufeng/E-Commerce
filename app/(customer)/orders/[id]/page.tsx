"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrderDetailPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id") || searchParams.get("orderNumber");
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setError("Order not found");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();

        if (!res.ok || !data.data) {
          setError(data.error || "Order not found");
          return;
        }

        setOrder(data.data);
      } catch (err) {
        setError("Failed to load order");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  const statusColors: Record<string, string> = {
    PENDING: "badge-warning",
    CONFIRMED: "badge-info",
    READY_FOR_PICKUP: "badge-success",
    PICKED_UP: "badge-success",
    CANCELLED: "badge-danger",
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Link href="/orders" className="text-primary-600 hover:underline mb-4 inline-block">
          ← Back to My Orders
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
          <span className={`badge ${statusColors[order.status] || "badge-info"}`}>
            {order.status.toLowerCase().replace(/_/g, " ")}
          </span>
        </div>

        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Order Number</p>
              <p className="font-medium">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-gray-500">Order Date</p>
              <p className="font-medium">{formatDateTime(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Customer Name</p>
              <p className="font-medium">{order.customerFirstName} {order.customerLastName}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium">{order.customerEmail}</p>
            </div>
            {order.customerPhone && (
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Payment Method</p>
              <p className="font-medium">{order.paymentMethod.replace(/_/g, " ")}</p>
            </div>
          </div>
        </div>

        {order.pickupSlot && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">Pickup Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Pickup Date</p>
                <p className="font-medium">{formatDateTime(order.pickupSlot.date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Pickup Time</p>
                <p className="font-medium">{order.pickupSlot.startTime} - {order.pickupSlot.endTime}</p>
              </div>
            </div>
            {order.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-gray-500 text-sm">Order Notes</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        )}

        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
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

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}