"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface ScanResult {
  barcode: string;
  format: string;
  timestamp: number;
}

interface UseBarcodeScannerOptions {
  onScan?: (result: ScanResult) => void;
  active?: boolean;
}

export function useBarcodeScanner({ onScan, active = false }: UseBarcodeScannerOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanningRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError(
          typeof window !== "undefined" && !window.isSecureContext
            ? "Camera requires a secure (HTTPS) connection"
            : "Camera is not available in this browser"
        );
        setHasCamera(false);
        return null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasCamera(true);
      return stream;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      let message = "Camera access denied or not available";
      if (name === "NotAllowedError") {
        message = "Camera permission denied. Allow camera access for this site in your browser settings, then retry.";
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        message = "No camera device was found on this device.";
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        message = "The camera is already in use by another application.";
      } else if (name === "OverconstrainedError") {
        message = "The requested camera settings are not supported on this device.";
      } else if (name === "SecurityError") {
        message = "Camera access is blocked. A secure (HTTPS) connection is required.";
      }
      console.error("[BarcodeScanner] getUserMedia failed:", name || err);
      setError(message);
      setHasCamera(false);
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    scanningRef.current = false;
    setIsScanning(false);
    setError(null);
  }, []);

  const scanFrame = useCallback(async () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

    try {
      const { scanImageData } = await import("@undecaf/zbar-wasm");
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < 2) {
        requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        requestAnimationFrame(scanFrame);
        return;
      }

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const symbols = await scanImageData(imageData);

      if (symbols.length > 0) {
        const symbol = symbols[0];
        const result: ScanResult = {
          barcode: symbol.decode(),
          format: symbol.typeName || "unknown",
          timestamp: Date.now(),
        };
        setLastResult(result);
        onScan?.(result);
        scanningRef.current = false;
        setIsScanning(false);
        return;
      }

      requestAnimationFrame(scanFrame);
    } catch {
      requestAnimationFrame(scanFrame);
    }
  }, [onScan]);

  const startScanning = useCallback(async () => {
    const stream = streamRef.current || (await startCamera());
    if (!stream) return;

    scanningRef.current = true;
    setIsScanning(true);
    requestAnimationFrame(scanFrame);
  }, [startCamera, scanFrame]);

  const stopScanning = useCallback(() => {
    scanningRef.current = false;
    setIsScanning(false);
    stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (!active) {
      stopScanning();
    }
  }, [active, stopScanning]);

  // Always release the camera when the hook unmounts. Kept separate from the
  // `active` effect so that toggling `active` true never tears down a scan that
  // was just started in the same render.
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    videoRef,
    canvasRef,
    isScanning,
    error,
    lastResult,
    hasCamera,
    startCamera,
    stopCamera,
    startScanning,
    stopScanning,
  };
}
