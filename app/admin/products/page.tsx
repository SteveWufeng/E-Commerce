"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ImageUpload } from "@/components/ui/image-upload";
import { BarcodeInput } from "@/components/admin/barcode-input";
import { ScanModeBar, type BulkMode } from "@/components/admin/scan-mode-bar";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit, Trash2, X, ChevronUp, ChevronDown, Scan, ScanLine } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useScannerInput } from "@/hooks/use-scanner-input";
import { useSettingsStore } from "@/hooks/use-settings";

interface OptionDraft {
  id?: string;
  quantity: string;
  label: string;
  priceMode: "SAME_UNIT_PRICE" | "CUSTOM_TOTAL";
  totalPrice: string;
}

function emptyOptionDraft(): OptionDraft {
  return { quantity: "", label: "", priceMode: "SAME_UNIT_PRICE", totalPrice: "" };
}

function productOptionsToDrafts(options: any[]): OptionDraft[] {
  return (options || []).map((o) => ({
    id: o.id,
    quantity: String(o.quantity),
    label: o.label || "",
    priceMode: o.priceMode,
    totalPrice: o.totalPrice != null ? String(o.totalPrice) : "",
  }));
}

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? 0 : n;
}

function collectOptions(opts: OptionDraft[]): Array<Record<string, unknown>> | null {
  const seen = new Set<number>();
  const options: Array<Record<string, unknown>> = [];
  for (const o of opts) {
    const quantity = parseInt(o.quantity);
    if (!Number.isInteger(quantity) || quantity < 2 || seen.has(quantity)) return null;
    seen.add(quantity);
    if (o.priceMode === "CUSTOM_TOTAL") {
      const totalPrice = parseFloat(o.totalPrice);
      if (!Number.isFinite(totalPrice) || totalPrice <= 0) return null;
      options.push({ quantity, label: o.label || null, priceMode: "CUSTOM_TOTAL", totalPrice });
    } else {
      options.push({ quantity, label: o.label || null, priceMode: "SAME_UNIT_PRICE", totalPrice: null });
    }
  }
  return options;
}

function BundleOptionsEditor({
  options,
  onChange,
  unitPrice,
  error,
}: {
  options: OptionDraft[];
  onChange: (options: OptionDraft[]) => void;
  unitPrice: number;
  error: string;
}) {
  const { t } = useLocale();

  function update(i: number, patch: Partial<OptionDraft>) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function remove(i: number) {
    onChange(options.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t("bundleOptions")}
      </label>
      <p className="text-xs text-gray-400 mb-2">{t("bundleOptionsHint")}</p>
      {options.map((o, i) => (
        <div key={o.id || i} className="border border-gray-200 rounded-lg p-3 mb-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="2"
              value={o.quantity}
              onChange={(e) => update(i, { quantity: e.target.value })}
              className="input flex-1"
              placeholder={t("packQuantity")}
            />
            <button
              onClick={() => remove(i)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label={t("removeBundleOption")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={o.label}
            onChange={(e) => update(i, { label: e.target.value })}
            className="input w-full"
            placeholder={t("packLabelPlaceholder")}
          />
          <div className="flex items-center gap-2">
            <select
              value={o.priceMode}
              onChange={(e) => update(i, { priceMode: e.target.value as OptionDraft["priceMode"] })}
              className="input flex-1"
            >
              <option value="SAME_UNIT_PRICE">{t("sameUnitPrice")}</option>
              <option value="CUSTOM_TOTAL">{t("customTotalPrice")}</option>
            </select>
            {o.priceMode === "CUSTOM_TOTAL" ? (
              <input
                type="number"
                step="0.01"
                min="0"
                value={o.totalPrice}
                onChange={(e) => update(i, { totalPrice: e.target.value })}
                className="input flex-1"
                placeholder={t("packTotalPrice")}
              />
            ) : (
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {o.quantity && unitPrice > 0
                  ? formatCurrency((parseInt(o.quantity) || 0) * unitPrice)
                  : "—"}
              </span>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={() => onChange([...options, emptyOptionDraft()])}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <Plus className="w-4 h-4" />
        {t("addBundleOption")}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

export default function AdminProductsPage() {
  const { t } = useLocale();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [addProduct, setAddProduct] = useState(false);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [scannerMode, setScannerMode] = useState(false);
  const [scanModeBarOpen, setScanModeBarOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode>("add_stock");
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    salePrice: "",
    stock: "",
    barcode: "",
    categoryId: "",
    description: "",
    images: [] as string[],
  });
  const [editOptions, setEditOptions] = useState<OptionDraft[]>([]);
  const [editOptionsError, setEditOptionsError] = useState("");
  const [newProductOptions, setNewProductOptions] = useState<OptionDraft[]>([]);
  const [newProductOptionsError, setNewProductOptionsError] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<"USD" | "VES">("USD");
  const [newPriceCurrency, setNewPriceCurrency] = useState<"USD" | "VES">("USD");
  const settings = useSettingsStore((state) => state.settings);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products?limit=100"),
          fetch("/api/products/categories"),
        ]);
        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        setProducts(productsData.data || []);
        setCategories(categoriesData.data || []);
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  const isBarcodeSearch = /^\d{8,14}$/.test(search);

  const filtered = products
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      if (isBarcodeSearch) {
        return p.barcode && p.barcode.includes(search);
      }
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "category":
          cmp = (a.category?.name || "").localeCompare(b.category?.name || "");
          break;
        case "barcode":
          cmp = (a.barcode || "").localeCompare(b.barcode || "");
          break;
        case "sale":
          cmp = ((a.comparePrice || 0) - (b.comparePrice || 0));
          break;
        case "price":
          cmp = (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
          break;
        case "stock":
          cmp = (a.stock || 0) - (b.stock || 0);
          break;
        case "status":
          cmp = (a.isActive ? 0 : 1) - (b.isActive ? 0 : 1);
          break;
      }
      return cmp * dir;
    });

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function handleEditClick(product: any) {
    setEditProduct(product);
    setEditPrice(product.price.toString());
    setEditSalePrice(product.comparePrice ? product.comparePrice.toString() : "");
    setEditStock(product.stock.toString());
    setEditBarcode(product.barcode || "");
    setEditImages(product.images || []);
    setEditOptions(productOptionsToDrafts(product.options));
    setEditOptionsError("");
    setPriceCurrency("USD");
  }

  async function handleSaveEdit() {
    if (!editProduct) return;

    const options = collectOptions(editOptions);
    if (!options) {
      setEditOptionsError(t("bundleOptionsInvalid"));
      return;
    }
    setEditOptionsError("");

    setIsSaving(true);
    try {
      const rate = toNum(settings?.conversionRate ?? 1) || 1;
      let priceUsd = parseFloat(editPrice);
      if (priceCurrency === "VES" && rate > 0) {
        priceUsd = priceUsd / rate;
      }
      const body: Record<string, unknown> = {
        price: priceUsd,
        stock: parseInt(editStock),
        barcode: editBarcode || null,
        images: editImages,
        options,
      };
      if (editSalePrice) {
        let saleUsd = parseFloat(editSalePrice);
        if (priceCurrency === "VES" && rate > 0) {
          saleUsd = saleUsd / rate;
        }
        body.comparePrice = saleUsd;
      } else {
        body.comparePrice = null;
      }

      const res = await fetch(`/api/products/${editProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editProduct.id
              ? { ...p, price: priceUsd, stock: parseInt(editStock), barcode: editBarcode || null, images: updated.data.images, comparePrice: updated.data.comparePrice, options: updated.data.options }
              : p
          )
        );
        setEditProduct(null);
      } else {
        const data = await res.json();
        console.error("Failed to update product:", data.error);
      }
    } catch (error) {
      console.error("Failed to update product:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddProduct() {
    if (!newProduct.name || !newProduct.price || !newProduct.categoryId) return;

    const options = collectOptions(newProductOptions);
    if (!options) {
      setNewProductOptionsError(t("bundleOptionsInvalid"));
      return;
    }
    setNewProductOptionsError("");

    setIsSaving(true);
    try {
      const rate = toNum(settings?.conversionRate ?? 1) || 1;
      let priceUsd = parseFloat(newProduct.price);
      if (newPriceCurrency === "VES" && rate > 0) {
        priceUsd = priceUsd / rate;
      }
      const body: Record<string, unknown> = {
        name: newProduct.name,
        description: newProduct.description,
        price: priceUsd,
        stock: parseInt(newProduct.stock) || 0,
        barcode: newProduct.barcode || undefined,
        categoryId: newProduct.categoryId,
        images: newProduct.images,
        isActive: true,
        options,
      };
      if (newProduct.salePrice) {
        let saleUsd = parseFloat(newProduct.salePrice);
        if (newPriceCurrency === "VES" && rate > 0) {
          saleUsd = saleUsd / rate;
        }
        body.comparePrice = saleUsd;
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const created = await res.json();
        setProducts((prev) => [...prev, created.data]);
        setAddProduct(false);
        setNewProduct({ name: "", price: "", salePrice: "", stock: "", barcode: "", categoryId: "", description: "", images: [] });
        setNewProductOptions([]);
        setNewProductOptionsError("");
      } else {
        console.error("Failed to create product");
      }
    } catch (error) {
      console.error("Failed to create product:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm(t("confirmDeleteProduct"))) return;

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        console.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  }

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      setSearch(barcode);
      try {
        const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const product = data.data[0];
          if (bulkMode === "add_stock" || bulkMode === "remove_stock") {
            const adjustment = bulkMode === "add_stock" ? 1 : -1;
            const stockRes = await fetch(`/api/products/${product.id}/stock`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ adjustment }),
            });
            if (stockRes.ok) {
              const stockData = await stockRes.json();
              setProducts((prev) =>
                prev.map((p) => (p.id === product.id ? { ...p, stock: stockData.data.stock } : p))
              );
            }
          } else if (bulkMode === "view_edit") {
            handleEditClick(product);
            setScanModeBarOpen(false);
          } else if (bulkMode === "set_price") {
            handleEditClick(product);
            setScanModeBarOpen(false);
          }
        }
      } catch (error) {
        console.error("Barcode scan error:", error);
      }
    },
    [bulkMode]
  );

  useScannerInput({
    onScan: handleBarcodeScan,
    enabled: scannerMode,
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("products")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScannerMode(!scannerMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              scannerMode
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <ScanLine className="w-4 h-4" />
            {t("scannerMode")}
          </button>
          <button
            onClick={() => setScanModeBarOpen(!scanModeBarOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              scanModeBarOpen
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Scan className="w-4 h-4" />
            {t("bulkOperations")}
          </button>
          <button onClick={() => { setAddProduct(true); setNewPriceCurrency("USD"); setNewProductOptions([]); setNewProductOptionsError(""); }} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            {t("addProduct")}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={scannerMode ? `${t("scanBarcode")}...` : t("searchProductsPlaceholder")}
          className="input max-w-md"
          autoFocus={scannerMode}
        />
        {scannerMode && (
          <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            {t("scannerMode")}
          </span>
        )}
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
                  {(["name", "barcode", "category", "sale", "price", "stock", "status"] as const).map((field) => (
                    <th
                      key={field}
                      className={`text-left py-3 px-3 sm:px-4 ${
                        field === "barcode" || field === "sale"
                          ? "hidden lg:table-cell"
                          : field === "category"
                          ? "hidden md:table-cell"
                          : ""
                      }`}
                    >
                      <button
                        onClick={() => handleSort(field)}
                        className="flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {field === "name" ? t("productName") : field === "barcode" ? t("barcode") : field === "category" ? t("categories") : field === "sale" ? t("onSale") : field === "price" ? t("price") : field === "stock" ? t("stock") : t("status")}
                        {sortField === field ? (
                          sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 sm:px-4 font-medium text-gray-900">{product.name}</td>
                    <td className="hidden lg:table-cell py-3 px-3 sm:px-4">
                      {product.barcode ? (
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {product.barcode}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell py-3 px-3 sm:px-4 text-gray-500">{product.category?.name || "—"}</td>
                    <td className="hidden lg:table-cell py-3 px-3 sm:px-4">
                      {product.comparePrice && parseFloat(product.comparePrice) > parseFloat(product.price) ? (
                        <span className="badge badge-warning text-xs">{t("onSale")}</span>
                      ) : (
                        <span className="text-gray-300">{t("notOnSale")}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      {product.comparePrice && parseFloat(product.comparePrice) > parseFloat(product.price) ? (
                        <span>
                          <span className="text-gray-400 line-through mr-1">{formatCurrency(product.comparePrice)}</span>
                          <span className="text-red-600 font-medium">{formatCurrency(product.price)}</span>
                        </span>
                      ) : (
                        formatCurrency(product.price)
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span
                        className={
                          product.stock <= 0
                            ? "text-red-600 font-medium"
                            : product.stock <= 5
                            ? "text-amber-600 font-medium"
                            : "text-green-600"
                        }
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span
                        className={`badge ${
                          product.isActive ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {product.isActive ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {search ? t("noProductsMatch") : t("noProductsYetAdd")}
            </div>
          )}
        </div>
      )}

      {editProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t("editProduct")}</h2>
              <button
                onClick={() => setEditProduct(null)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("productName")}
                </label>
                <p className="text-gray-900 font-medium">{editProduct.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("barcode")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    className="input flex-1"
                    placeholder={t("barcode")}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("price")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("salePrice")} <span className="text-gray-400 font-normal">— {t("notOnSale")} original price, leave empty for no sale</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editSalePrice}
                  onChange={(e) => setEditSalePrice(e.target.value)}
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("stock")}
                </label>
                <input
                  type="number"
                  min="0"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="input w-full"
                />
              </div>
              <BundleOptionsEditor
                options={editOptions}
                onChange={(opts) => {
                  setEditOptions(opts);
                  setEditOptionsError("");
                }}
                unitPrice={parseFloat(editPrice) || 0}
                error={editOptionsError}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receiptImage")}
                </label>
                <ImageUpload images={editImages} onChange={setEditImages} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditProduct(null)}
                className="flex-1 btn-secondary"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 btn-primary"
              >
                {isSaving ? t("creating") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {addProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t("addNewProduct")}</h2>
              <button
                onClick={() => setAddProduct(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("productName")} *
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="input w-full"
                  placeholder={t("productName")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("barcode")}
                </label>
                <BarcodeInput
                  value={newProduct.barcode}
                  onChange={(v) => setNewProduct({ ...newProduct, barcode: v })}
                  onProductFound={(product) => {
                    setNewProduct({
                      name: product.name,
                      price: product.price.toString(),
                      salePrice: product.comparePrice?.toString() || "",
                      stock: product.stock.toString(),
                      barcode: product.barcode || "",
                      categoryId: product.categoryId || "",
                      description: product.description || "",
                      images: product.images || [],
                    });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("description")}
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder={t("description")}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("price")} ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="input w-full"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("stock")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="input w-full"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("salePrice")} <span className="text-gray-400 font-normal">— optional, marks product as on sale</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProduct.salePrice}
                  onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>
              <BundleOptionsEditor
                options={newProductOptions}
                onChange={(opts) => {
                  setNewProductOptions(opts);
                  setNewProductOptionsError("");
                }}
                unitPrice={parseFloat(newProduct.price) || 0}
                error={newProductOptionsError}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("categories")} *
                </label>
                <select
                  value={newProduct.categoryId}
                  onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">{t("categories")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receiptImage")}
                </label>
                <ImageUpload
                  images={newProduct.images}
                  onChange={(imgs) => setNewProduct({ ...newProduct, images: imgs })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAddProduct(false)}
                className="flex-1 btn-secondary"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddProduct}
                disabled={isSaving || !newProduct.name || !newProduct.price || !newProduct.categoryId}
                className="flex-1 btn-primary"
              >
                {isSaving ? t("creating") : t("addProduct")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ScanModeBar
        open={scanModeBarOpen}
        onClose={() => setScanModeBarOpen(false)}
        onProductScanned={handleBarcodeScan}
        onModeChange={setBulkMode}
      />
    </AdminLayout>
  );
}
