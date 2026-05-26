"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

export function HeroBanner() {
  const { t } = useLocale();

  return (
    <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            {t("heroTitle")}
            <br />
            <span className="text-primary-200">{t("heroSubtitle1")}</span>
          </h1>
          <p className="mt-4 text-lg text-primary-100 max-w-lg">
            {t("heroDescription")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/#products" className="bg-white text-primary-700 font-semibold px-6 py-3 rounded-lg hover:bg-primary-50 transition-colors shadow-sm">
              {t("shopNow")}
            </Link>
            <Link href="/pickup" className="border border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">
              {t("schedulePickup")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
