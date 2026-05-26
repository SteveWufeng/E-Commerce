"use client";

import { useCurrency } from "@/hooks/use-currency";
import { useLocale } from "@/hooks/use-locale";

export function DualCurrency({ usdAmount, className }: { usdAmount: number; className?: string }) {
  const { symbol, conversionRate } = useCurrency();
  const { t } = useLocale();
  const converted = usdAmount * conversionRate;

  return (
    <span className={className}>
      <span>{symbol}{converted.toFixed(2)}</span>
      {conversionRate !== 1 && (
        <span className="text-xs text-gray-400 ml-1.5">
          (~${usdAmount.toFixed(2)} USD)
        </span>
      )}
    </span>
  );
}
