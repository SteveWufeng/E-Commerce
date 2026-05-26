"use client";

import { Globe } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "es" ? "en" : "es")}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      aria-label="Toggle language"
    >
      <Globe className="w-3.5 h-3.5" />
      <span className="uppercase">{locale === "es" ? "EN" : "ES"}</span>
    </button>
  );
}
