"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

/**
 * Admin pickups page — manage pickup time slots.
 *
 * Features:
 * - View all pickup slots
 * - Create new slots
 * - Activate/deactivate slots
 * - Delete slots
 * - See current bookings per slot
 */
export default function AdminPickupsPage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await fetch("/api/pickup-slots");
        const data = await res.json();
        setSlots(data.data || []);
      } catch (error) {
        console.error("Failed to load pickup slots:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSlots();
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pickup Slots</h1>
        <button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Slot
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-gray-200 h-16" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Booked</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{formatDate(slot.date)}</td>
                    <td className="py-3 px-4">
                      {slot.startTime} – {slot.endTime}
                    </td>
                    <td className="py-3 px-4">
                      {slot.currentOrders} / {slot.maxOrders}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge ${
                          slot.isActive ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {slot.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {slots.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No pickup slots configured. Create your first slot!
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
