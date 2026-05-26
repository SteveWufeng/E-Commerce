"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ImageUpload } from "@/components/ui/image-upload";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit, Trash2, X } from "lucide-react";

/**
 * Admin products page — manage product catalog.
 *
 * Features:
 * - Product list with search
 * - Add new product
 * - Edit existing products
 * - Delete products
 * - Stock level indicators
 * - Category filtering
 */
export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [addProduct, setAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    stock: "",
    categoryId: "",
    description: "",
    images: [] as string[],
  });

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

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleEditClick(product: any) {
    setEditProduct(product);
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
    setEditImages(product.images || []);
  }

  async function handleSaveEdit() {
    if (!editProduct) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${editProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: parseFloat(editPrice),
          stock: parseInt(editStock),
          images: editImages,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editProduct.id
              ? { ...p, price: parseFloat(editPrice), stock: parseInt(editStock), images: updated.data.images }
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

    setIsSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          stock: parseInt(newProduct.stock) || 0,
          categoryId: newProduct.categoryId,
          images: newProduct.images,
          isActive: true,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setProducts((prev) => [...prev, created.data]);
        setAddProduct(false);
        setNewProduct({ name: "", price: "", stock: "", categoryId: "", description: "", images: [] });
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
    if (!confirm("Are you sure you want to delete this product?")) return;

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

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button onClick={() => setAddProduct(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="input max-w-md"
        />
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Price</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Stock</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                    <td className="py-3 px-4 text-gray-500">{product.category?.name || "—"}</td>
                    <td className="py-3 px-4">{formatCurrency(product.price)}</td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <span
                        className={`badge ${
                          product.isActive ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
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
              {search ? "No products match your search." : "No products yet. Add your first product!"}
            </div>
          )}
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Product</h2>
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
                  Product Name
                </label>
                <p className="text-gray-900 font-medium">{editProduct.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($)
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
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Images
                </label>
                <ImageUpload images={editImages} onChange={setEditImages} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditProduct(null)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 btn-primary"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {addProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add New Product</h2>
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
                  Product Name *
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="input w-full"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Enter product description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price ($) *
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
                    Stock
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
                  Category *
                </label>
                <select
                  value={newProduct.categoryId}
                  onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Images
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
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={isSaving || !newProduct.name || !newProduct.price || !newProduct.categoryId}
                className="flex-1 btn-primary"
              >
                {isSaving ? "Creating..." : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
