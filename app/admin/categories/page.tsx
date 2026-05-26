"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Plus, Edit, Trash2, X, Check } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setCategories((prev) => [...prev, created.data]);
        setNewName("");
        setShowAdd(false);
      }
    } catch (error) {
      console.error("Failed to create category:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave(id: string) {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories((prev) => prev.map((c) => (c.id === id ? updated.data : c)));
        setEditingId(null);
      }
    } catch (error) {
      console.error("Failed to update category:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Products in this category will need reassignment.")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-gray-200 h-14" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No categories yet.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Slug</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Products</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {editingId === cat.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="input py-1 px-2 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSave(cat.id)}
                            disabled={isSaving}
                            className="p-1 rounded text-green-600 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded text-gray-400 hover:bg-gray-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">{cat.name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{cat.slug}</td>
                    <td className="py-3 px-4 text-gray-500">{cat._count?.products ?? "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditName(cat.name);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
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
        </div>
      )}

      {/* Add Category Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Category</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input w-full"
                placeholder="Enter category name"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={handleAdd} disabled={isSaving || !newName.trim()} className="flex-1 btn-primary">
                {isSaving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
