import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes without conflicts.
 * Handles duplicate class resolution intelligently.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD).
 */
export type CurrencyCode = "USD" | "GOLD" | "BOLIVAR" | string;

export function formatCurrency(amount: number | string, currency: CurrencyCode = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  const rates: Record<string, number> = {
    USD: 1,
    // Placeholder conversion rates — update with real rates as needed
    GOLD: 0.00007, // 1 USD = 0.00007 troy ounces (approx placeholder)
    BOLIVAR: 5000000, // 1 USD = 5,000,000 Bs (placeholder)
  };

  const rate = rates[currency] ?? 1;
  const converted = num * rate;

  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(converted);
  }

  if (currency === "GOLD") {
    return `${converted.toFixed(6)} oz`;
  }

  if (currency === "BOLIVAR") {
    return `${Math.round(converted).toLocaleString("en-US")} Bs`;
  }

  return `${converted.toFixed(2)} ${currency}`;
}

/**
 * Format a date as a human-readable string.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Format a date and time for display.
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Generate a slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
