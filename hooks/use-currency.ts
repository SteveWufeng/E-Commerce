"use client";

import { create } from "zustand";
import { useSettingsStore } from "./use-settings";

/**
 * Customer currency preference.
 *
 * Product prices are stored in USD. The "local" currency is derived as
 * `USD * Settings.conversionRate` (admin labels it "1 USD = ?"). Customers
 * choose to see prices as either USD ($), local (Bs.), or USDT,
 * and the choice is persisted in localStorage and shared across the app.
 */
export type CurrencyPref = "USD" | "VES" | "USDT";

export const CURRENCY_STORAGE_KEY = "ecom_currency_pref";
export const LOCAL_CURRENCY_SYMBOL = "Bs.";
export const USDT_CURRENCY_SYMBOL = "USDT";

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? 0 : n;
}

interface CurrencyStoreState {
  pref: CurrencyPref;
  hydrated: boolean;
  setPref: (pref: CurrencyPref) => void;
  togglePref: () => void;
  hydrate: () => void;
}

export const useCurrencyStore = create<CurrencyStoreState>((set, get) => ({
  pref: "USD",
  hydrated: false,

  setPref: (pref) => {
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, pref);
    } catch {}
    set({ pref, hydrated: true });
  },

  togglePref: () => {
    const current = get().pref;
    return get().setPref(current === "USDT" ? "USD" : "USDT");
  },

  hydrate: () => {
    try {
      const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored === "USD" || stored === "VES" || stored === "USDT") {
        set({ pref: stored, hydrated: true });
        return;
      }
    } catch {}
    set({ hydrated: true });
  },
}));

export function useCurrency() {
  const pref = useCurrencyStore((state) => state.pref);
  const hydrated = useCurrencyStore((state) => state.hydrated);
  const setPref = useCurrencyStore((state) => state.setPref);
  const togglePref = useCurrencyStore((state) => state.togglePref);

  const settings = useSettingsStore((state) => state.settings);
  const rate = toNum(settings?.conversionRate ?? 1) || 1;
  const usdtRate = toNum(settings?.usdtRate ?? 1) || 1;
  const usdtSymbol = typeof settings?.usdtSymbol === "string" && settings.usdtSymbol.trim() ? settings.usdtSymbol.trim() : USDT_CURRENCY_SYMBOL;

  const isVES = pref === "VES";
  const isUSDT = pref === "USDT";
  const isUSD = pref === "USD";
  const symbol = isVES ? LOCAL_CURRENCY_SYMBOL : isUSDT ? usdtSymbol : "$";

  const convert = (usdAmount: number | string): number => {
    const num = toNum(usdAmount);
    if (isVES) return num * rate;
    if (isUSDT) return num * usdtRate;
    return num;
  };

  const format = (usdAmount: number | string): string => {
    const value = convert(usdAmount);
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    const separator = isUSDT && /^[a-z0-9]+$/i.test(symbol) ? " " : "";
    return `${symbol}${separator}${formatted}`;
  };

  return {
    pref,
    hydrated,
    isUSD,
    isVES,
    isUSDT,
    symbol,
    rate,
    usdtRate,
    usdtSymbol,
    convert,
    format,
    setPref,
    togglePref,
  };
}
