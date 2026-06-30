"use client";

import { useState, useCallback, useEffect } from "react";
import { Scan, PackagePlus, PackageMinus, Eye, DollarSign, History, X, Check } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useBarcodeScanner, type ScanResult } from "@/hooks/use-barcode-scanner";

export type BulkMode = "add_stock" | "remove_stock" | "view_edit" | "set_price";

interface ScanHistoryItem {
  barcode: string;
  productName?: string;
  mode: BulkMode;
  timestamp: number;
  success: boolean;
}

interface ScanModeBarProps {
  open: boolean;
  onClose: () => void;
  onProductScanned: (barcode: string, mode: BulkMode) => void;
  onModeChange?: (mode: BulkMode) => void;
}

export function ScanModeBar({ open, onClose, onProductScanned, onModeChange }: ScanModeBarProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<BulkMode>("add_stock");
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [flash, setFlash] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const handleScan = useCallback(
    (result: ScanResult) => {
      setFlash(true);
      setLastScanned(result.barcode);
      setTimeout(() => setFlash(false), 300);
      if (navigator.vibrate) navigator.vibrate(100);
      playBeep();
      onProductScanned(result.barcode, mode);
      setHistory((prev) => [
        { barcode: result.barcode, mode, timestamp: Date.now(), success: true },
        ...prev.slice(0, 49),
      ]);
    },
    [mode, onProductScanned]
  );

  const scanner = useBarcodeScanner({
    onScan: handleScan,
    active: open,
  });

  useEffect(() => {
    if (!open) {
      scanner.stopScanning();
    }
  }, [open]);

  function handleModeChange(newMode: BulkMode) {
    setMode(newMode);
    onModeChange?.(newMode);
  }

  const modes = [
    { id: "add_stock" as BulkMode, label: t("addStock"), icon: PackagePlus },
    { id: "remove_stock" as BulkMode, label: t("removeStock"), icon: PackageMinus },
    { id: "view_edit" as BulkMode, label: t("viewEdit"), icon: Eye },
    { id: "set_price" as BulkMode, label: t("setPrice"), icon: DollarSign },
  ];

  return (
    <>
      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900 text-sm">{t("bulkOperations")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scanner.startScanning()}
                  disabled={scanner.isScanning}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {scanner.isScanning ? t("scanning") : t("scanBarcode")}
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title={t("scanHistory")}
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    scanner.stopScanning();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              {modes.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleModeChange(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      mode === m.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-48">
              <video
                ref={scanner.videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={scanner.canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/4 border-2 border-blue-400 rounded-lg opacity-60" />
              </div>
              {flash && (
                <div className="absolute inset-0 bg-green-400/30 animate-pulse pointer-events-none" />
              )}
              {!scanner.isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-white text-sm">{t("pointCameraAtBarcode")}</p>
                </div>
              )}
              {scanner.isScanning && (
                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="animate-pulse">●</span>
                  {t("scanning")}
                </div>
              )}
            </div>

            {lastScanned && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                <Check className="w-3.5 h-3.5" />
                {t("scanComplete")}: {lastScanned}
              </div>
            )}

            {showHistory && history.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-2">
                <p className="text-xs font-medium text-gray-500 mb-1">{t("scanHistory")}</p>
                {history.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-gray-600 py-0.5">
                    <span>{item.barcode}</span>
                    <span className="text-gray-400">{item.mode}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Audio not available
  }
}
