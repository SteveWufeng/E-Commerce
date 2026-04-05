"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { SearchBar } from "@/components/product/search-bar";
import { CategoryNav } from "@/components/product/category-nav";
import { HeroBanner } from "@/components/product/hero-banner";
import { Product, Category } from "@/types";

/**
 * Customer home page — the main storefront.
 *
 * Features:
 * - Hero banner with promotions
 * - Category navigation
 * - Product grid with search/filter
 * - Featured products section
 * - Responsive layout for all devices
 */
export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products").then((r) => r.json()),
          fetch("/api/products/categories").then((r) => r.json()),
        ]);

        setProducts(productsRes.data || []);
        setCategories(categoriesRes.data || []);
        setFeatured((productsRes.data || []).filter((p: Product) => p.isFeatured));
      } catch (error) {
        console.error("Failed to load storefront data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter products based on search and category
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCategory =
      !selectedCategory || product.category?.slug === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Banner */}
        <HeroBanner />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="mb-6">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search products..."
            />
          </div>

          {/* Category Navigation */}
          <CategoryNav
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          {/* Featured Products */}
          {featured.length > 0 && !searchQuery && !selectedCategory && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Featured Products
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {featured.slice(0, 5).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}

          {/* All Products */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : selectedCategory
                ? categories.find((c) => c.slug === selectedCategory)?.name
                : "All Products"}
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl bg-gray-200 aspect-[3/4]"
                  />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">
                  No products found. Try a different search or category.
                </p>
                <Link href="/" className="btn-primary mt-4">
                  Browse All Products
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
