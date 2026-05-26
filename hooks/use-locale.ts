"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { translations, type Locale, type TranslationKey } from "@/lib/i18n/translations";

const STORAGE_KEY = "ecom_locale";
const DEFAULT_LOCALE: Locale = "es";

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => translations[DEFAULT_LOCALE][key] || key,
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function useLocaleState(): LocaleContextValue {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") {
        setLocaleState(stored);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      window.localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = translations[locale] || translations[DEFAULT_LOCALE];
      const template = dict[key];
      if (!template) return key;
      return interpolate(template, params);
    },
    [locale]
  );

  return { locale: hydrated ? locale : DEFAULT_LOCALE, setLocale, t };
}
