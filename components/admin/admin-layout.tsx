"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tags,
  Settings,
  Store,
  CreditCard,
  MessageSquare,
  Users,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { AdminNotificationBell } from "@/components/admin/admin-notifications";

/**
 * Admin layout wrapper — provides sidebar navigation for admin pages.
 *
 * Features:
 * - Collapsible sidebar on mobile
 * - Active page highlighting
 * - Quick link back to storefront
 * - Admin-only nav items hidden from staff
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "ADMIN";

  const allNavItems = [
    { href: "/admin/dashboard", label: t("dashboard"), icon: LayoutDashboard, adminOnly: false },
    { href: "/admin/products", label: t("products"), icon: Package, adminOnly: false },
    { href: "/admin/orders", label: t("orders"), icon: ShoppingBag, adminOnly: false },
    { href: "/admin/messages", label: t("messages"), icon: MessageSquare, adminOnly: false },
    { href: "/admin/categories", label: t("categories"), icon: Tags, adminOnly: false },
    { href: "/admin/payment-methods", label: t("paymentMethods"), icon: CreditCard, adminOnly: true },
    { href: "/admin/users", label: t("users"), icon: Users, adminOnly: true },
    { href: "/admin/settings", label: t("settings"), icon: Settings, adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => isAdmin || !item.adminOnly);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 text-white">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Store className="w-6 h-6" />
            <span className="font-bold text-lg">{t("adminPanelTitle")}</span>
          </Link>
          <AdminNotificationBell className="text-gray-300 hover:text-white" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <Store className="w-4 h-4" />
            {t("viewStorefront")}
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white safe-top border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            <span className="font-bold">{t("adminPanelTitle")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <AdminNotificationBell className="text-gray-300 hover:text-white" />
            <Link href="/" className="text-sm text-gray-400 hover:text-white whitespace-nowrap">
              {t("viewStorefront")}
            </Link>
          </div>
        </div>
        <nav className="flex overflow-x-auto scrollbar-hide snap-x px-4 pb-3 gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 snap-start items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="lg:mt-0 mt-24 p-4 sm:p-6 lg:p-8 pb-10 safe-bottom">{children}</div>
      </main>
    </div>
  );
}
