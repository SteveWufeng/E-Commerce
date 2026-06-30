"use client";

import { useState, useCallback } from "react";
import { Scan, X, Check } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { BarcodeScanner } from "./barcode-scanner";
import type { ScanResult } from "@/hooks/use-barcode-scanner";

interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onProductFound?: (product: any) => void;
  onProductNotFound?: (barcode: string) => void;
}

export function BarcodeInput({ value, onChange, onProductFound, onProductNotFound }: BarcodeInputProps) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "found" | "not_found">("idle");
  const [foundProduct, setFoundProduct] = useState<any>(null);

  const lookupProduct = useCallback(
    async (barcode: string) => {
      if (!barcode) return;
      setLoading(true);
      setStatus("idle");
      setFoundProduct(null);
      onChange(barcode);

      try {
        const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setStatus("found");
          setFoundProduct(data.data[0]);
          onProductFound?.(data.data[0]);
        } else {
          setStatus("not_found");
          onProductNotFound?.(barcode);
        }
      } catch {
        setStatus("not_found");
      } finally {
        setLoading(false);
      }
    },
    [onChange, onProductFound, onProductNotFound]
  );

  const handleScan = useCallback(
    (result: ScanResult) => {
      lookupProduct(result.barcode);
    },
    [lookupProduct]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setStatus("idle");
              setFoundProduct(null);
            }}
            placeholder={t("barcode")}
            className="input w-full pr-10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                lookupProduct(value);
              }
            }}
          />
          {value && (
            <button
              onClick={() => {
                onChange("");
                setStatus("idle");
                setFoundProduct(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <BarcodeScanner onScan={handleScan} />
        <button
          type="button"
          onClick={() => lookupProduct(value)}
          disabled={!value || loading}
          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          title={t("scanBarcode")}
        >
          <Check className="w-5 h-5" />
        </button>
      </div>

      {loading && (
        <p className="text-xs text-gray-500">{t("searching") || "Searching..."}</p>
      )}

      {status === "found" && foundProduct && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <div className="text-xs text-green-700">
            <span className="font-medium">{foundProduct.name}</span>
            {" — "}{t("stock")}: {foundProduct.stock}
          </div>
        </div>
      )}

      {status === "not_found" && !loading && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Scan className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            {t("productNotFound")} — {t("addProduct")}
          </p>
        </div>
      )}
    </div>
  );
}
