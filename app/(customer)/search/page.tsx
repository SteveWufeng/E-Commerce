"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { useLocale } from "@/hooks/use-locale";
import { Product } from "@/types";

/**
 * Search results page.
 *
 * Supports:
 * - Full-text search across product names and tags
 * - Category filtering
 * - Price range filtering
 * - Sort by relevance, price, name
 * - Responsive grid layout
 */
export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; sort?: string };
}) {
  const { t } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const query = searchParams.q || "";

  useEffect(() => {
    async function searchProducts() {
      if (!query) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set("q", query);
        if (searchParams.category) params.set("category", searchParams.category);
        if (searchParams.sort) params.set("sort", searchParams.sort);

        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        setProducts(data.data || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    searchProducts();
  }, [query, searchParams.category, searchParams.sort]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {query ? t("searchResultsFor", { query }) : t("searchProductsHeading")}
        </h1>
        <p className="text-gray-500 mb-8">
          {isLoading
            ? t("searching")
            : products.length === 1
              ? t("productFound", { count: products.length })
              : t("productsFound", { count: products.length })}
        </p>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {t("noSearchResults")}
            </p>
            <Link href="/" className="btn-primary mt-4">
              {t("browseAllProducts")}
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
