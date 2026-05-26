"use client";

import { ReactNode, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { LocaleContext, useLocaleState } from "@/hooks/use-locale";
import { useSettingsStore } from "@/hooks/use-settings";

function LocaleProvider({ children }: { children: ReactNode }) {
  const localeValue = useLocaleState();
  return (
    <LocaleContext.Provider value={localeValue}>
      {children}
    </LocaleContext.Provider>
  );
}

function SettingsProvider({ children }: { children: ReactNode }) {
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <LocaleProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </LocaleProvider>
      </SettingsProvider>
    </SessionProvider>
  );
}
