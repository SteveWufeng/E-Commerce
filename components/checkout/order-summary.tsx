"use client";

import { useLocale } from "@/hooks/use-locale";
import { DualPrice } from "@/components/ui/dual-price";
import type { CartItem } from "@/types";

export function OrderSummary({
  items,
  subtotal,
  total,
}: {
  items: CartItem[];
  subtotal: number;
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
          <div key={item.productId + (item.optionId ?? "")} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.name}
              {item.optionLabel && <span className="text-primary-600"> ({item.optionLabel})</span>}{" "}
              <span className="text-gray-400">x{item.quantity}</span>
            </span>
            <span className="font-medium">
              <DualPrice
                amount={item.price * item.quantity}
                primaryClassName="font-medium text-sm text-gray-900"
                secondaryClassName="text-xs text-gray-500"
              />
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{t("subtotal")}</span>
          <span><DualPrice amount={subtotal} primaryClassName="text-sm text-gray-600" secondaryClassName="text-xs text-gray-500" /></span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900 text-base">
          <span>{t("total")}</span>
          <span><DualPrice amount={total} primaryClassName="text-base font-semibold text-gray-900" secondaryClassName="text-xs text-gray-500" /></span>
        </div>
      </div>
    </div>
  );
}
