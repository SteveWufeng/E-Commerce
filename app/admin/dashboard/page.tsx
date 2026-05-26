"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { DashboardMetrics } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag, DollarSign, Package } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

/**
 * Admin dashboard — overview of store performance.
 *
 * Displays:
 * - Key metrics: revenue, orders, profit, average order value
 * - Daily sales chart (last 7 days)
 * - Top-selling products
 * - Recent orders table
 * - Order status distribution
 */
export default function AdminDashboardPage() {
  const { t } = useLocale();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch("/api/analytics/dashboard");
        const data = await res.json();
        setMetrics(data.data);
      } catch (error) {
        console.error("Failed to load dashboard metrics:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-200 h-28" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  if (!metrics) {
    return (
      <AdminLayout>
        <div className="text-center py-16 text-gray-500">
          {t("noSalesData")}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("dashboard")}</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label={t("totalRevenue")}
          value={formatCurrency(metrics.totalRevenue)}
          color="bg-green-50 text-green-700"
        />
        <MetricCard
          icon={<ShoppingBag className="w-5 h-5" />}
          label={t("totalOrders")}
          value={metrics.totalOrders.toString()}
          color="bg-blue-50 text-blue-700"
        />
        <MetricCard
          icon={<Package className="w-5 h-5" />}
          label={t("avgOrderValue")}
          value={formatCurrency(metrics.averageOrderValue)}
          color="bg-amber-50 text-amber-700"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("topProducts")}
          </h2>
          {metrics.topProducts.length > 0 ? (
            <div className="space-y-3">
              {metrics.topProducts.map((product, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      {product.unitsSold} {t("sold")}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t("noSalesData")}</p>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("ordersByStatus")}
          </h2>
          {Object.keys(metrics.ordersByStatus).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(metrics.ordersByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-gray-700 capitalize">
                    {status.toLowerCase().replace(/_/g, " ")}
                  </span>
                  <span className="badge badge-info">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t("noOrdersYet2")}</p>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("recentOrders")}
        </h2>
        {metrics.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    {t("orderHash")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    {t("totalLabel")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    {t("status")}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    {t("date")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-primary-600">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-3 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">{t("noOrdersYet2")}</p>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "badge-warning",
    CONFIRMED: "badge-info",
    READY_FOR_PICKUP: "badge-success",
    PICKED_UP: "badge-success",
    CANCELLED: "badge-danger",
  };

  return (
    <span className={`badge ${styles[status] || "badge-info"}`}>
      {status.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}
