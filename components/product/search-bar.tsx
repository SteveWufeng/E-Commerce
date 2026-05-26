"use client";

import { Search } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useLocale();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t("searchProducts")}
        className="input pl-10 pr-4 py-3 text-base"
        aria-label={t("searchProducts")}
      />
    </div>
  );
}
