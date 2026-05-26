"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="bg-gray-900 text-gray-400 safe-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Store Info */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">
              {process.env.NEXT_PUBLIC_STORE_NAME || "E-Commerce Store"}
            </h3>
            <p className="text-sm leading-relaxed">
              {process.env.NEXT_PUBLIC_STORE_ADDRESS || "123 Main St, City, State"}
            </p>
            <p className="text-sm mt-2">
              {t("orderOnlinePickup")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t("quickLinks")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  {t("shopAll")}
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white transition-colors">
                  {t("cart")}
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  {t("myOrders")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  {t("signIn")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Pickup Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t("pickupHours")}</h3>
            <ul className="space-y-2 text-sm">
              <li>Monday – Friday: 9:00 AM – 7:00 PM</li>
              <li>Saturday: 9:00 AM – 5:00 PM</li>
              <li>Sunday: 10:00 AM – 3:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {process.env.NEXT_PUBLIC_STORE_NAME || "E-Commerce Store"}. {t("allRightsReserved")}</p>
        </div>
      </div>
    </footer>
  );
}
