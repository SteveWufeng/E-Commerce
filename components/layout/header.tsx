"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingBag, User, Menu, X } from "lucide-react";
import { useCartCount } from "@/hooks/use-cart";
import { useCurrency } from "@/hooks/use-currency";
import { useSettingsStore } from "@/hooks/use-settings";
import { signOut } from "next-auth/react";
import { useLocale } from "@/hooks/use-locale";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

function CurrencyDisplay() {
  const { symbol, conversionRate } = useCurrency();
  const settings = useSettingsStore((state) => state.settings);
  
  if (!settings) return null;
  
  return (
    <div className="text-xs text-gray-500 hidden sm:block">
      {settings.currencyCode}: {settings.currencySymbol}{conversionRate.toFixed(2)}
    </div>
  );
}

/**
 * Site header — responsive navigation bar with auth state.
 *
 * Features:
 * - Store logo/name
 * - Navigation links
 * - Cart badge with item count and bounce animation
 * - Mobile hamburger menu
 * - User account link with dropdown (sign in / profile / sign out)
 * - Admin panel link for admin users
 *
 * Uses useCartCount for optimized cart badge updates.
 */
export function Header() {
  const { t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  
  // Use optimized cart count - returns 0 until hydrated
  const itemCount = useCartCount();
  const prevCountRef = useRef(0);

  // Trigger bounce animation when item count increases
  useEffect(() => {
    const prevCount = prevCountRef.current;
    if (itemCount > prevCount && prevCount > 0) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 500);
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  const [user, setUser] = useState<{
    name: string | null;
    email: string | null;
    role: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data?.user) {
          setUser({
            name: data.user.name,
            email: data.user.email,
            role: data.user.role || "CUSTOMER",
          });
        }
      } catch {
        // Session fetch failed — user is not logged in
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  async function handleSignOut() {
    await signOut({ callbackUrl: "/" });
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">
              {process.env.NEXT_PUBLIC_STORE_NAME || "Store"}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
              {t("shop")}
            </Link>
            {user && (
              <Link href="/orders" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                {t("myOrders")}
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link href="/admin/dashboard" className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">
                {t("admin")}
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Currency display */}
            <div className="hidden sm:block">
              <CurrencyDisplay />
            </div>
            {/* User Menu */}
            <div className="relative">
              {isLoading ? (
                <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
              ) : user ? (
                <>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
                      aria-label={t("accountMenu")}
                      aria-expanded={userMenuOpen}
                    >
                    <User className="w-5 h-5" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-gray-200 shadow-lg py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("myProfile")}
                      </Link>

                      <Link
                        href="/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("myOrders")}
                      </Link>

                      {user.role === "ADMIN" && (
                        <Link
                          href="/admin/dashboard"
                          className="block px-4 py-2 text-sm text-purple-600 hover:bg-purple-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          {t("adminPanel")}
                        </Link>
                      )}

                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                      >
                        {t("signOut")}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label={t("signIn")}
                >
                  <User className="w-5 h-5" />
                </Link>
              )}
            </div>

            {/* Cart */}
            <Link
              href="/cart"
              className={`relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors ${cartBounce ? "animate-bounce-once" : ""}`}
              aria-label={`Cart (${itemCount} items)`}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-100 animate-slide-down">
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("shop")}
              </Link>

              {user && (
                <>
                  <Link
                    href="/orders"
                    className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("myOrders")}
                  </Link>
                  <Link
                    href="/profile"
                    className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("myProfile")}
                  </Link>
                </>
              )}

              {user?.role === "ADMIN" && (
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 rounded-lg text-purple-600 hover:bg-purple-50 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("adminPanel")}
                </Link>
              )}

              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium text-left"
                >
                  {t("signOut")}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("signIn")}
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>

      {/* Close dropdown when clicking outside */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </header>
  );
}