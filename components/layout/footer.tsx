"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { useSettingsStore } from "@/hooks/use-settings";

export function Footer() {
  const { t } = useLocale();
  const settings = useSettingsStore((state) => state.settings);
  const ph = settings?.pickupHours;

  const storeName = settings?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "E-Commerce Store";
  const storeAddress = settings?.storeAddress || process.env.NEXT_PUBLIC_STORE_ADDRESS || "";

  return (
    <footer className="bg-gray-900 text-gray-400 safe-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Store Info */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">
              {storeName}
            </h3>
            {storeAddress && (
              <p className="text-sm leading-relaxed">{storeAddress}</p>
            )}
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
              {ph ? (
                <>
                  {["monday","tuesday","wednesday","thursday","friday"].every((d) => ph[d]) &&
                    ph.monday === ph.tuesday &&
                    ph.tuesday === ph.wednesday &&
                    ph.wednesday === ph.thursday &&
                    ph.thursday === ph.friday ? (
                    <li>
                      {t("monday")} – {t("friday")}: {ph.monday}
                    </li>
                  ) : (
                    ["monday","tuesday","wednesday","thursday","friday"].map((d) =>
                      ph[d] ? (
                        <li key={d}>
                          {t(d as any)}: {ph[d]}
                        </li>
                      ) : null
                    )
                  )}
                  {ph.saturday && (
                    <li>{t("saturday")}: {ph.saturday}</li>
                  )}
                  {ph.sunday && (
                    <li>{t("sunday")}: {ph.sunday}</li>
                  )}
                </>
              ) : (
                <>
                  <li>{t("monday")} – {t("friday")}: 9:00 AM – 7:00 PM</li>
                  <li>{t("saturday")}: 9:00 AM – 5:00 PM</li>
                  <li>{t("sunday")}: 10:00 AM – 3:00 PM</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {storeName}. {t("allRightsReserved")}</p>
        </div>
      </div>
    </footer>
  );
}
