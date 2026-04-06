"use client";

import { useState, useEffect } from "react";
import type { CurrencyCode } from "@/lib/utils";

const STORAGE_KEY = "ecom_currency";

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setCurrency(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // ignore
    }
  }, [currency]);

  return { currency, setCurrency } as {
    currency: CurrencyCode;
    setCurrency: (c: CurrencyCode) => void;
  };
}
