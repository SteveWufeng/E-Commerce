"use client";

import { useCurrency, type CurrencyPref } from "@/hooks/use-currency";

/**
 * Two-state currency toggle: USD | Bs.
 * Persists the choice (see useCurrency) so it carries across pages.
 */
export function CurrencyToggle({ className = "" }: { className?: string }) {
  const { pref, setPref } = useCurrency();

  const options: { value: CurrencyPref; label: string }[] = [
    { value: "USD", label: "USD" },
    { value: "VES", label: "Bs." },
  ];

  return (
    <div
      className={`inline-flex items-center rounded-full bg-gray-100 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Currency"
    >
      {options.map((option) => {
        const active = pref === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPref(option.value)}
            aria-pressed={active}
            className={`px-2.5 py-1 rounded-full transition-colors ${
              active
                ? "bg-white text-primary-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
