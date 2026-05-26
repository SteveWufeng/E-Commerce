"use client";

import { useCurrency } from "@/hooks/use-currency";

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

export function DualCurrency({ usdAmount, className }: { usdAmount: number | string; className?: string }) {
  const { symbol, conversionRate } = useCurrency();
  const num = toNum(usdAmount);
  const converted = num * toNum(conversionRate);

  return (
    <span className={`${className} inline-flex flex-col leading-tight`}>
      <span className="font-medium">{symbol}{converted.toFixed(2)}</span>
      {conversionRate !== 1 && (
        <span className="text-[10px] text-gray-400">
          ${num.toFixed(2)} USD
        </span>
      )}
    </span>
  );
}
