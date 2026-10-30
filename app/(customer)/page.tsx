"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const res = await fetch("/api/products/categories", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCategories(data.data || []);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProducts = useCallback(
    async (pageNum: number, append: boolean, signal?: AbortSignal) => {
      const requestId = ++requestIdRef.current;
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("page", String(pageNum));
      if (searchQuery) params.set("q", searchQuery);
      if (selectedCategory) params.set("category", selectedCategory);

      if (!append) {
        setIsLoading(true);
        setHasMore(false);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await fetch(`/api/products?${params.toString()}`, {
          headers: { Accept: "application/json" },
          signal,
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        const nextProducts = data.data || [];
        if (requestId !== requestIdRef.current) return;
        setProducts(append ? (prev) => [...prev, ...nextProducts] : nextProducts);
        setPage(pageNum);
        const pagination = data.pagination;
        setHasMore(
          pagination
            ? pagination.page < pagination.totalPages
            : nextProducts.length >= 50
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load products:", error);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          if (!append) setIsLoading(false);
          else setIsLoadingMore(false);
        }
      }
    },
    [searchQuery, selectedCategory]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(1, false, controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    await fetchProducts(page + 1, true);
  }, [fetchProducts, isLoading, isLoadingMore, hasMore, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    const current = loadMoreRef.current;
    if (current) {
      observer.observe(current);
    }
    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [loadMore]);

  const isOnSale = (p: Product) =>
    p.comparePrice !== null && Number(p.comparePrice) > Number(p.price);
  const deals = products.filter(isOnSale);

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
              <SearchBar value={searchInput} onChange={setSearchInput} />
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
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {hasMore && (
                  <div ref={loadMoreRef} className="py-8 flex justify-center">
                    {isLoadingMore ? (
                      <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
                    ) : (
                      <div className="text-gray-400 text-sm">&nbsp;</div>
                    )}
                  </div>
                )}
              </>
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
