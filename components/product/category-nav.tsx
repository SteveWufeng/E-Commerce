"use client";

import type { Category } from "@/types";

/**
 * Horizontal scrollable category navigation.
 *
 * Features:
 * - Scrollable on mobile (hide scrollbar)
 * - Active category highlight
 * - "All" option to clear filter
 * - Touch-friendly tap targets
 */
export function CategoryNav({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <div className="mb-6 -mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {/* "All" button */}
        <button
          onClick={() => onSelect(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selected === null
              ? "bg-primary-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>

        {categories
          .filter((c) => c.isActive)
          .map((category) => (
            <button
              key={category.id}
              onClick={() => onSelect(category.slug)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selected === category.slug
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category.name}
            </button>
          ))}
      </div>
    </div>
  );
}
