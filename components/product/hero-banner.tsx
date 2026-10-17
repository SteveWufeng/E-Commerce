"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

export function HeroBanner() {
  const { t } = useLocale();

  return (
    <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              {t("heroTitle")}{" "}
              <span className="text-primary-200">{t("heroSubtitle1")}</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-primary-100">
              {t("heroDescription")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="#products"
              className="bg-white text-primary-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-50 transition-colors shadow-sm whitespace-nowrap"
            >
              {t("shopNow")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
