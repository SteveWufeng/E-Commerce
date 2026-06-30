"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseScannerInputOptions {
  onScan?: (barcode: string) => void;
  enabled?: boolean;
  debounceMs?: number;
  minLength?: number;
}

export function useScannerInput({
  onScan,
  enabled = true,
  debounceMs = 100,
  minLength = 8,
}: UseScannerInputOptions = {}) {
  const bufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        if (code.length >= minLength && /^\d+$/.test(code)) {
          setLastScanned(code);
          onScan?.(code);
        }
        bufferRef.current = "";
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          bufferRef.current = "";
        }, debounceMs);
      }
    },
    [enabled, debounceMs, minLength, onScan]
  );

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      return;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, handleKeyDown]);

  return { lastScanned };
}
