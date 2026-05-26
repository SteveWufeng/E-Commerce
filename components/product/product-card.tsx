"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { useCartStore } from "@/hooks/use-cart";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/hooks/use-locale";
import { DualCurrency } from "@/components/ui/dual-currency";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useLocale();
  const addItem = useCartStore((state) => state.addItem);
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock <= 0;
  const onSale = product.comparePrice && product.comparePrice > product.price;
  const { showToast } = useToast();

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || "",
      maxStock: product.stock,
    });
    showToast(t("addedToCart", { product: product.name }), "success");
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Image */}
      <Link href={`/product/${product.slug}`} className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Sale badge */}
        {onSale && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            {t("sale")}
          </span>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg">
              {t("outOfStock")}
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3">
        <Link href={`/product/${product.slug}`} className="font-medium text-gray-900 text-sm line-clamp-2 hover:text-primary-600 transition-colors">
          {product.name}
        </Link>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">
              <DualCurrency usdAmount={product.price} />
            </span>
            {onSale && (
              <span className="text-sm text-gray-400 line-through">
                <DualCurrency usdAmount={product.comparePrice!} />
              </span>
            )}
          </div>

          {/* Stock indicator */}
          {isLowStock && !isOutOfStock && (
            <p className="text-xs text-amber-600 mt-1">
              {t("onlyXLeft", { count: product.stock })}
            </p>
          )}

          {/* Add to cart */}
          {!isOutOfStock && (
            <button
              onClick={handleAddToCart}
              className="mt-2 w-full btn-primary text-xs py-2"
            >
              {t("addToCart")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
