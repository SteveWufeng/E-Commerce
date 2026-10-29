"use client";

import { useCurrency } from "@/hooks/use-currency";
import { useSettingsStore } from "@/hooks/use-settings";

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Shows price as USD + local currency (e.g., Bs.) or USDT only.
 */
export function DualPrice({
  amount,
  className,
  primaryClassName,
  secondaryClassName,
}: {
  amount: number | string;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}) {
  const { pref, rate, usdtRate, usdtSymbol } = useCurrency();
  const settings = useSettingsStore((state) => state.settings);
  const num = toNum(amount);
  const localSymbol = settings?.currencySymbol || "Bs.";
  const localValue = num * rate;
  const usdtValue = num * usdtRate;
  const usdValue = num;

  const format = (value: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const usdtSeparator = /^[a-z0-9]+$/i.test(usdtSymbol) ? " " : "";

  if (pref === "VES") {
    return (
      <div className={`flex items-baseline gap-2 ${className || ""}`}>
        <span className={primaryClassName || "text-lg font-bold text-gray-900"}>
          {localSymbol}
          {format(localValue)}
        </span>
        <span className={secondaryClassName || "text-xs text-gray-500"}>
          ${format(usdValue)}
        </span>
      </div>
    );
  }

  if (pref === "USDT") {
    return (
      <div className={`flex items-baseline gap-2 ${className || ""}`}>
        <span className={primaryClassName || "text-lg font-bold text-gray-900"}>
          {usdtSymbol}
          {usdtSeparator}
          {format(usdtValue)}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-baseline gap-2 ${className || ""}`}>
      <span className={primaryClassName || "text-lg font-bold text-gray-900"}>
        ${format(usdValue)}
      </span>
      <span className={secondaryClassName || "text-xs text-gray-500"}>
        {localSymbol}
        {format(localValue)}
      </span>
    </div>
  );
}
