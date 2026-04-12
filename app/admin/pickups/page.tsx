"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, Edit2, X } from "lucide-react";

interface PickupSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  currentOrders: number;
  isActive: boolean;
}

/**
 * Admin pickups page — manage pickup time slots.
 *
 * Features:
 * - View all pickup slots
 * - Create new slots with configurable time intervals
 * - Edit slot max orders
 * - Activate/deactivate slots
 * - Delete slots
 * - See current bookings per slot
 */
export default function AdminPickupsPage() {
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSlot, setEditSlot] = useState<PickupSlot | null>(null);
  const [newSlot, setNewSlot] = useState({
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    intervalMinutes: 60,
    maxOrders: 10,
  });
  const [editMaxOrders, setEditMaxOrders] = useState("");

  useEffect(() => {
    loadSlots();
  }, []);

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

  async function handleAddSlots() {
    try {
      const slotsToCreate: Array<{
        date: string;
        startTime: string;
        endTime: string;
        maxOrders: number;
      }> = [];

      const [startHour, startMin] = newSlot.startTime.split(":").map(Number);
      const [endHour, endMin] = newSlot.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const interval = newSlot.intervalMinutes;

      for (let time = startMinutes; time < endMinutes; time += interval) {
        const slotStart = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
        const slotEnd = `${String(Math.floor((time + interval) / 60)).padStart(2, "0")}:${String((time + interval) % 60).padStart(2, "0")}`;

        slotsToCreate.push({
          date: newSlot.date,
          startTime: slotStart,
          endTime: slotEnd,
          maxOrders: newSlot.maxOrders,
        });
      }

      for (const slot of slotsToCreate) {
        await fetch("/api/pickup-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slot),
        });
      }

      setShowAddModal(false);
      setNewSlot({ date: "", startTime: "09:00", endTime: "17:00", intervalMinutes: 60, maxOrders: 10 });
      loadSlots();
    } catch (error) {
      console.error("Failed to create slots:", error);
    }
  }

  async function handleUpdateMaxOrders() {
    if (!editSlot || !editMaxOrders) return;

    try {
      await fetch(`/api/pickup-slots/${editSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxOrders: parseInt(editMaxOrders) }),
      });
      setEditSlot(null);
      setEditMaxOrders("");
      loadSlots();
    } catch (error) {
      console.error("Failed to update slot:", error);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    if (!confirm("Delete this pickup slot?")) return;

    try {
      await fetch(`/api/pickup-slots/${slotId}`, { method: "DELETE" });
      loadSlots();
    } catch (error) {
      console.error("Failed to delete slot:", error);
    }
  }

  async function handleToggleActive(slot: PickupSlot) {
    try {
      await fetch(`/api/pickup-slots/${slot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !slot.isActive }),
      });
      loadSlots();
    } catch (error) {
      console.error("Failed to toggle slot:", error);
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pickup Slots</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Slots
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Time Window</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Capacity</th>
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
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${Math.min((slot.currentOrders / slot.maxOrders) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(slot)}
                        className={`badge cursor-pointer ${slot.isActive ? "badge-success" : "badge-danger"}`}
                      >
                        {slot.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditSlot(slot); setEditMaxOrders(slot.maxOrders.toString()); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Add Slots Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Pickup Slots</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newSlot.date}
                  onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Interval (minutes)
                </label>
                <select
                  value={newSlot.intervalMinutes}
                  onChange={(e) => setNewSlot({ ...newSlot, intervalMinutes: parseInt(e.target.value) })}
                  className="input w-full"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Orders per Slot</label>
                <input
                  type="number"
                  min="1"
                  value={newSlot.maxOrders}
                  onChange={(e) => setNewSlot({ ...newSlot, maxOrders: parseInt(e.target.value) })}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary">Cancel</button>
              <button
                onClick={handleAddSlots}
                disabled={!newSlot.date}
                className="flex-1 btn-primary"
              >
                Create Slots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Pickup Slot</h2>
              <button onClick={() => setEditSlot(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <p className="text-gray-900">{formatDate(editSlot.date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Window</label>
                <p className="text-gray-900">{editSlot.startTime} – {editSlot.endTime}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Orders</label>
                <input
                  type="number"
                  min="1"
                  value={editMaxOrders}
                  onChange={(e) => setEditMaxOrders(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditSlot(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={handleUpdateMaxOrders} className="flex-1 btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
