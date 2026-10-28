"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { SearchBar } from "@/components/product/search-bar";
import { HeroBanner } from "@/components/product/hero-banner";
import { CurrencyToggle } from "@/components/layout/currency-toggle";
import { useLocale } from "@/hooks/use-locale";
import { Product, Category } from "@/types";

/**
 * Customer home page — the main storefront.
 *
 * Layout (Walmart-inspired, mobile-first):
 * - Slim hero banner
 * - Prominent search + currency toggle
 * - "Shop by category" grid
 * - Deals row (products on sale), horizontal scroll on mobile
 * - All products grid
 */
export default function HomePage() {
  const { t } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data (explicitly request JSON and handle non-JSON responses)
  useEffect(() => {
    async function fetchJson(path: string) {
      const res = await fetch(path, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Request failed ${path}: ${res.status} ${res.statusText} - ${txt.slice(0, 200)}`);
      }
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Invalid JSON response from ${path}: ${txt.slice(0, 200)}`);
      }
      return res.json();
    }

    async function loadData() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetchJson("/api/products?limit=1000"),
          fetchJson("/api/products/categories"),
        ]);

        setProducts(productsRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (error) {
        console.error("Failed to load storefront data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const isOnSale = (p: Product) =>
    p.comparePrice !== null && Number(p.comparePrice) > Number(p.price);
  const deals = products.filter(isOnSale);

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

  const activeCategories = categories.filter((c) => c.isActive);
  const heading = searchQuery
    ? t("resultsFor", { query: searchQuery })
    : selectedCategory
    ? categories.find((c) => c.slug === selectedCategory)?.name
    : t("allProducts");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <HeroBanner />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Search + currency toggle */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <CurrencyToggle />
          </div>

          {/* Shop by category */}
          {!searchQuery && activeCategories.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                {t("shopByCategory")}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {activeCategories.map((category) => {
                  const active = selectedCategory === category.slug;
                  return (
                    <button
                      key={category.id}
                      onClick={() =>
                        setSelectedCategory(active ? null : category.slug)
                      }
                      aria-pressed={active}
                      className="group text-left"
                    >
                      <div
                        className={`relative rounded-xl overflow-hidden ring-2 transition ${
                          category.image
                            ? "aspect-square bg-gray-100"
                            : "flex flex-col items-center justify-center gap-1 px-2 py-5 bg-gradient-to-br from-primary-50 to-primary-100"
                        } ${
                          active
                            ? "ring-primary-500"
                            : "ring-transparent group-hover:ring-primary-200"
                        }`}
                      >
                        {category.image ? (
                          <>
                            <Image
                              src={category.image}
                              alt={category.name}
                              fill
                              sizes="(max-width: 640px) 33vw, 16vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2">
                              <span className="text-white text-xs font-semibold line-clamp-2">
                                {category.name}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-primary-600 text-2xl font-bold">
                              {category.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-primary-700 text-xs font-semibold text-center leading-tight line-clamp-2">
                              {category.name}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Deals */}
          {!searchQuery && !selectedCategory && deals.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                {t("deals")}
              </h2>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {deals.slice(0, 10).map((product) => (
                  <div key={product.id} className="w-40 sm:w-44 flex-shrink-0">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All products */}
          <section id="products" className="scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {heading}
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm font-medium text-primary-600 hover:underline"
                >
                  {t("viewAll")}
                </button>
              )}
            </div>

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
                <p className="text-gray-500 text-lg">{t("noProductsFound")}</p>
                <Link href="/" className="btn-primary mt-4">
                  {t("browseAllProducts")}
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
