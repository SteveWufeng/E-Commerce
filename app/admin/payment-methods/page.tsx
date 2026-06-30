"use client";

import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { useLocale } from "@/hooks/use-locale";
import { Upload, X, ImageIcon } from "lucide-react";

interface PaymentMethodForm {
  id?: string;
  name: string;
  description: string;
  iconUrl: string;
  qrCodeUrl: string;
  isActive: boolean;
  sortOrder: number;
  proofType: string;
  proofLabel: string;
  proofImageRequired: boolean;
  requiresTransactionId: boolean;
}

const defaultForm: PaymentMethodForm = {
  name: "",
  description: "",
  iconUrl: "",
  qrCodeUrl: "",
  isActive: true,
  sortOrder: 0,
  proofType: "IMAGE",
  proofLabel: "",
  proofImageRequired: false,
  requiresTransactionId: false,
};

export default function AdminPaymentMethodsPage() {
  const { t } = useLocale();
  const [methods, setMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentMethodForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMethods();
  }, []);

  async function loadMethods() {
    try {
      const res = await fetch("/api/admin/payment-methods");
      const data = await res.json();
      setMethods(data.data || []);
    } catch (error) {
      console.error("Failed to load payment methods:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setForm(defaultForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(method: any) {
    setForm({
      id: method.id,
      name: method.name,
      description: method.description,
      iconUrl: method.iconUrl || "",
      qrCodeUrl: method.qrCodeUrl || "",
      isActive: method.isActive,
      sortOrder: method.sortOrder,
      proofType: method.proofType,
      proofLabel: method.proofLabel || "",
      proofImageRequired: method.proofImageRequired,
      requiresTransactionId: method.requiresTransactionId,
    });
    setEditingId(method.id);
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/payment-methods/${editingId}`
        : "/api/admin/payment-methods";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      await loadMethods();
      setShowModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.orderCount) {
          setDeleteError(t("deletePaymentMethodBlocked"));
          return;
        }
        throw new Error(data.error || "Failed to delete");
      }

      await loadMethods();
      setDeleteConfirm(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete");
    }
  }

  async function toggleActive(method: any) {
    try {
      await fetch(`/api/admin/payment-methods/${method.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !method.isActive }),
      });
      await loadMethods();
    } catch (error) {
      console.error("Failed to toggle:", error);
    }
  }

  async function handleIconUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        if (form.iconUrl && form.iconUrl.startsWith("https://")) {
          fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: form.iconUrl }) }).catch(() => {});
        }
        setForm({ ...form, iconUrl: data.url });
      }
    } catch (e) {
      console.error("Icon upload failed:", e);
    } finally {
      setUploadingIcon(false);
    }
  }

  async function handleQrUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        if (form.qrCodeUrl && form.qrCodeUrl.startsWith("https://")) {
          fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: form.qrCodeUrl }) }).catch(() => {});
        }
        setForm({ ...form, qrCodeUrl: data.url });
      }
    } catch (e) {
      console.error("QR upload failed:", e);
    } finally {
      setUploadingQr(false);
    }
  }

  const proofTypeLabels: Record<string, string> = {
    NONE: t("noProofRequired"),
    IMAGE: "Image",
    TEXT: "Text",
    IMAGE_AND_TEXT: "Image + Text",
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("paymentMethods")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("paymentMethodsDescription")}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          {t("addPaymentMethod")}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-gray-200 h-16" />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t("noPaymentMethods")}</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("sortOrder")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("paymentMethodName")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("proofType")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("status")}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((method) => (
                  <tr key={method.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500">{method.sortOrder}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{method.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{method.description}</div>
                    </td>
                    <td className="py-3 px-4">{proofTypeLabels[method.proofType] || method.proofType}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleActive(method)}
                        className={`badge cursor-pointer ${
                          method.isActive ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {method.isActive ? t("active") : t("inactive")}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEdit(method)}
                        className="text-primary-600 hover:underline text-xs mr-3"
                      >
                        {t("editProduct")}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(method.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        {t("delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? t("editPaymentMethod") : t("addPaymentMethod")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">{t("paymentMethodName")} *</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">{t("paymentMethodDescription")} *</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t("paymentMethodIcon")}</label>
                  {form.iconUrl ? (
                    <div className="relative group aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mb-2">
                      <img
                        src={form.iconUrl}
                        alt="Icon"
                        className="w-full h-full object-contain p-2"
                        onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23f3f4f6' width='100' height='100'/><text x='50' y='55' text-anchor='middle' fill='%239ca3af' font-size='10'>Broken</text></svg>"; }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (form.iconUrl.startsWith("https://")) {
                            fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: form.iconUrl }) }).catch(() => {});
                          }
                          setForm({ ...form, iconUrl: "" });
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleIconUpload(f); }}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm mb-2 cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      onClick={() => iconFileRef.current?.click()}
                    >
                      <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                      {uploadingIcon ? "Uploading..." : "Drop or click to upload"}
                    </div>
                  )}
                  <input
                    ref={iconFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingIcon}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = ""; }}
                  />
                  {!form.iconUrl && (
                    <button
                      type="button"
                      onClick={() => iconFileRef.current?.click()}
                      disabled={uploadingIcon}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingIcon ? "Uploading..." : "Upload Icon"}
                    </button>
                  )}
                </div>
                <div>
                  <label className="label">{t("paymentMethodQrCode")}</label>
                  {form.qrCodeUrl ? (
                    <div className="relative group aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mb-2">
                      <img
                        src={form.qrCodeUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain p-2"
                        onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23f3f4f6' width='100' height='100'/><text x='50' y='55' text-anchor='middle' fill='%239ca3af' font-size='10'>Broken</text></svg>"; }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (form.qrCodeUrl.startsWith("https://")) {
                            fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: form.qrCodeUrl }) }).catch(() => {});
                          }
                          setForm({ ...form, qrCodeUrl: "" });
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleQrUpload(f); }}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm mb-2 cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      onClick={() => qrFileRef.current?.click()}
                    >
                      <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                      {uploadingQr ? "Uploading..." : "Drop or click to upload"}
                    </div>
                  )}
                  <input
                    ref={qrFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingQr}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQrUpload(f); e.target.value = ""; }}
                  />
                  {!form.qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => qrFileRef.current?.click()}
                      disabled={uploadingQr}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingQr ? "Uploading..." : "Upload QR Code"}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t("proofType")}</label>
                  <select
                    className="input"
                    value={form.proofType}
                    onChange={(e) => setForm({ ...form, proofType: e.target.value })}
                  >
                    <option value="NONE">{t("noProofRequired")}</option>
                    <option value="IMAGE">Image</option>
                    <option value="TEXT">Text</option>
                    <option value="IMAGE_AND_TEXT">Image + Text</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t("sortOrder")}</label>
                  <input
                    type="number"
                    className="input"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="label">{t("proofLabel")}</label>
                <input
                  type="text"
                  className="input"
                  value={form.proofLabel}
                  onChange={(e) => setForm({ ...form, proofLabel: e.target.value })}
                  placeholder="Upload your payment receipt"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary-500"
                    checked={form.proofImageRequired}
                    onChange={(e) => setForm({ ...form, proofImageRequired: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">{t("proofImageRequired")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary-500"
                    checked={form.requiresTransactionId}
                    onChange={(e) => setForm({ ...form, requiresTransactionId: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">{t("requiresTransactionId")}</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary-500"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">{t("active")}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary text-sm py-2 px-4"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.description}
                className="btn-primary text-sm py-2 px-4"
              >
                {saving ? t("creating") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-2">{t("confirmDeletePaymentMethod")}</h2>
            {deleteError && (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}
                className="btn-secondary text-sm py-2 px-4"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="btn-primary text-sm py-2 px-4 bg-red-600 hover:bg-red-700"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
