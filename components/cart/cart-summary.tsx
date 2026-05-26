"use client";

import { formatCurrency } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

export function CartSummary({
  subtotal,
  tax,
  total,
  itemCount,
}: {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}) {
  const { t } = useLocale();

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("orderSummary")}
      </h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{t("orderSummaryItemCount", { count: itemCount, items: itemCount !== 1 ? t("items") : t("item") })}</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{t("taxEstimated")}</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold text-gray-900 text-base">
          <span>{t("total")}</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {t("taxNote")}
      </p>
    </div>
  );
}
