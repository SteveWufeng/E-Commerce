"use client";

import { ReactNode, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { LocaleContext, useLocaleState } from "@/hooks/use-locale";
import { useSettingsStore } from "@/hooks/use-settings";
import { useCurrencyStore } from "@/hooks/use-currency";

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
  const hydrateCurrency = useCurrencyStore((state) => state.hydrate);

  useEffect(() => {
    fetchSettings();
    hydrateCurrency();
  }, [fetchSettings, hydrateCurrency]);

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
