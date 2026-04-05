/**
 * Analytics helper functions for the admin dashboard.
 *
 * Provides computed metrics from the database for:
 * - Revenue and sales over time
 * - Profit margins (requires product cost data)
 * - Top-selling products
 * - Demand trends
 * - Order status distribution
 */

import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalProfit: number;
  averageOrderValue: number;
  topProducts: { name: string; revenue: number; unitsSold: number }[];
  ordersByStatus: Record<string, number>;
  recentOrders: {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: Date;
  }[];
  dailySales: { date: string; revenue: number; orders: number }[];
}

/**
 * Fetch aggregated dashboard metrics for the admin panel.
 * Supports optional date range filtering.
 */
export async function getDashboardMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<DashboardMetrics> {
  const dateFilter: Record<string, unknown> = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const whereClause = Object.keys(dateFilter).length > 0
    ? { createdAt: dateFilter }
    : {};

  // Total revenue and orders
  const orders = await db.order.findMany({
    where: whereClause,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalRevenue = orders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Profit calculation (requires product cost data)
  let totalProfit = 0;
  const productSales: Record<string, { name: string; revenue: number; units: number }> = {};

  for (const order of orders) {
    for (const item of order.items) {
      const revenue = Number(item.productPrice) * item.quantity;
      const cost = item.productCost ? Number(item.productCost) * item.quantity : 0;
      totalProfit += revenue - cost;

      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, revenue: 0, units: 0 };
      }
      productSales[item.productId].revenue += revenue;
      productSales[item.productId].units += item.quantity;
    }
  }

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Orders by status
  const ordersByStatus: Record<string, number> = {};
  for (const order of orders) {
    ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
  }

  // Recent orders (last 10)
  const recentOrders = orders.slice(0, 10).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    total: Number(o.total),
    status: o.status,
    createdAt: o.createdAt,
  }));

  // Daily sales aggregation (last 7 days)
  const dailySales = getDailySales(orders);

  return {
    totalRevenue,
    totalOrders,
    totalProfit,
    averageOrderValue,
    topProducts,
    ordersByStatus,
    recentOrders,
    dailySales,
  };
}

/**
 * Aggregate orders into daily sales buckets.
 */
function getDailySales(orders: { createdAt: Date; total: Decimal }[]) {
  const dailyMap: Record<string, { revenue: number; orders: number }> = {};

  for (const order of orders) {
    const date = order.createdAt.toISOString().split("T")[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { revenue: 0, orders: 0 };
    }
    dailyMap[date].revenue += Number(order.total);
    dailyMap[date].orders += 1;
  }

  return Object.entries(dailyMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
}
