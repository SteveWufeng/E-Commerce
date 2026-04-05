"use client";

import { formatDate } from "@/lib/utils";
import type { PickupSlot } from "@/types";

/**
 * Pickup slot scheduler — lets customers choose a pickup time.
 *
 * Features:
 * - Groups slots by date
 * - Shows availability
 * - Visual selection state
 * - Disabled slots when full
 */
export function PickupScheduler({
  slots,
  selected,
  onSelect,
}: {
  slots: PickupSlot[];
  selected: string;
  onSelect: (slotId: string) => void;
}) {
  // Group slots by date
  const slotsByDate: Record<string, PickupSlot[]> = {};
  for (const slot of slots) {
    const dateKey = new Date(slot.date).toISOString().split("T")[0];
    if (!slotsByDate[dateKey]) slotsByDate[dateKey] = [];
    slotsByDate[dateKey].push(slot);
  }

  const sortedDates = Object.keys(slotsByDate).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pickup Time
        </h2>
        <p className="text-gray-500 text-sm">
          No pickup slots currently available. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Select Pickup Time
      </h2>

      <div className="space-y-4">
        {sortedDates.map((date) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {formatDate(date)}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slotsByDate[date].map((slot) => {
                const isSelected = selected === slot.id;
                const isAvailable = slot.isAvailable;

                return (
                  <button
                    key={slot.id}
                    onClick={() => isAvailable && onSelect(slot.id)}
                    disabled={!isAvailable}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : isAvailable
                        ? "border-gray-200 hover:border-gray-300 text-gray-700"
                        : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <div>{slot.startTime}</div>
                    <div className="text-xs mt-0.5">
                      {isAvailable
                        ? `${slot.maxOrders - slot.currentOrders} spots left`
                        : "Full"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
