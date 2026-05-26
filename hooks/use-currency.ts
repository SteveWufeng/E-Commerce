"use client";

import { useState, useEffect } from "react";
import { useSettingsStore } from "./use-settings";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "MXN" | "CAD" | "AUD";

const STORAGE_KEY = "ecom_currency";

export function useCurrency() {
  const settings = useSettingsStore((state) => state.settings);
  const [currency, setCurrency] = useState<string>("USD");

  useEffect(() => {
    if (settings) {
      setCurrency(settings.currencyCode);
      try {
        window.localStorage.setItem(STORAGE_KEY, settings.currencyCode);
      } catch {}
    } else {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setCurrency(stored);
      } catch {}
    }
  }, [settings]);

  return { 
    currency, 
    setCurrency,
    symbol: settings?.currencySymbol || "$",
    conversionRate: settings?.conversionRate || 1,
  };
}

export function formatWithConversion(amountInUSD: number | string): string {
  const num = typeof amountInUSD === "number" ? amountInUSD : parseFloat(String(amountInUSD)) || 0;
  const settings = useSettingsStore.getState().settings;
  if (!settings) return `$${num.toFixed(2)}`;
  const rate = typeof settings.conversionRate === "number" ? settings.conversionRate : parseFloat(String(settings.conversionRate)) || 1;
  const converted = num * rate;
  return `${settings.currencySymbol}${converted.toFixed(2)}`;
}