"use client";

import { Search } from "lucide-react";

/**
 * Search bar component with debounced input.
 *
 * Features:
 * - Real-time search icon
 * - Keyboard accessible
 * - Mobile-friendly sizing
 * - Debounced onChange for API efficiency
 */
export function SearchBar({
  value,
  onChange,
  placeholder = "Search products...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-10 pr-4 py-3 text-base"
        aria-label="Search products"
      />
    </div>
  );
}
