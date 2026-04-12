"use client";

import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Client-side providers wrapper.
 *
 * Wraps the app with any client-side context providers
 * that need to be available at the root level.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
