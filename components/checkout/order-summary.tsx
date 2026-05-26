"use client";

import { formatCurrency } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { DualCurrency } from "@/components/ui/dual-currency";
import type { CartItem } from "@/types";

export function OrderSummary({
  items,
  subtotal,
  tax,
  total,
}: {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}) {
  const { t } = useLocale();

  return (
    <div className="card sticky top-24">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("orderSummary")}
      </h2>

      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.name}{" "}
              <span className="text-gray-400">x{item.quantity}</span>
            </span>
            <span className="font-medium">
              <DualCurrency usdAmount={item.price * item.quantity} />
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{t("subtotal")}</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{t("tax")}</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900 text-base">
          <span>{t("total")}</span>
          <span><DualCurrency usdAmount={total} /></span>
        </div>
      </div>
    </div>
  );
}
