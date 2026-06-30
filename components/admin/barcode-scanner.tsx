"use client";

import { useRef, useEffect, useState } from "react";
import { Camera, CameraOff, Scan, X } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useBarcodeScanner, type ScanResult } from "@/hooks/use-barcode-scanner";

interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  onClose?: () => void;
  open?: boolean;
}

export function BarcodeScanner({ onScan, onClose, open = false }: BarcodeScannerProps) {
  const { t } = useLocale();
  const [showScanner, setShowScanner] = useState(false);
  const [flash, setFlash] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanningStarted, setScanningStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScan = (result: ScanResult) => {
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    setShowScanner(false);
    setScanningStarted(false);
    onScan(result);
  };

  const scanner = useBarcodeScanner({
    onScan: handleScan,
    active: open || (showScanner && scanningStarted),
  });

  useEffect(() => {
    if (open) {
      setShowScanner(true);
    }
  }, [open]);

  useEffect(() => {
    if (!showScanner) {
      scanner.stopScanning();
      setScanningStarted(false);
    }
  }, [showScanner]);

  function handleManualSubmit() {
    const code = manualCode.trim();
    if (!code) return;
    const result: ScanResult = {
      barcode: code,
      format: "manual",
      timestamp: Date.now(),
    };
    setManualCode("");
    setShowScanner(false);
    onScan(result);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowScanner(true)}
        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        title={t("scanBarcode")}
      >
        <Scan className="w-5 h-5" />
      </button>

      {showScanner && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div ref={containerRef} className="bg-gray-900 rounded-lg w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h3 className="text-white font-semibold text-sm">{t("barcodeScanner")}</h3>
              <button
                onClick={() => {
                  setShowScanner(false);
                  setScanningStarted(false);
                  onClose?.();
                }}
                className="p-1 rounded-lg hover:bg-gray-700 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black aspect-[4/3]">
              {!scanningStarted ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
                  <Camera className="w-12 h-12 text-gray-400" />
                  <p className="text-sm text-gray-400 px-4 text-center">{t("pointCameraAtBarcode")}</p>
                  <button
                    onClick={() => {
                      setScanningStarted(true);
                      scanner.startScanning();
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    {t("startScanning")}
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={scanner.videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <canvas ref={scanner.canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-1/3 border-2 border-blue-400 rounded-lg opacity-70" />
                  </div>
                  {scanner.isScanning && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      <span className="animate-pulse">●</span>
                      {t("scanning")}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      scanner.stopScanning();
                      setScanningStarted(false);
                    }}
                    className="absolute bottom-3 right-3 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 flex items-center gap-1.5"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    {t("stopScanning")}
                  </button>
                </>
              )}
              {flash && <div className="absolute inset-0 bg-green-400/30 animate-pulse pointer-events-none" />}
              {scanner.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-red-400 text-sm text-center px-4">
                    <p className="mb-2">{scanner.error}</p>
                    <button
                      onClick={() => scanner.startCamera()}
                      className="text-blue-400 underline text-xs"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={t("manualEntry")}
                  className="flex-1 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleManualSubmit();
                  }}
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {t("scanBarcode")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
