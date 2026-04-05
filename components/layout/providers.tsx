"use client";

import { ReactNode } from "react";

/**
 * Client-side providers wrapper.
 *
 * Wraps the app with any client-side context providers
 * that need to be available at the root level.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
