import { create } from "zustand";

interface Settings {
  storeName: string;
  storeAddress: string;
  taxRate: number;
  currencyCode: string;
  currencySymbol: string;
  conversionRate: number;
  bankTransferEnabled: boolean;
}

interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: true,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        set({ settings: data.data });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

export function getConvertedPrice(usdPrice: number): number {
  const settings = useSettingsStore.getState().settings;
  if (!settings) return usdPrice;
  return usdPrice * settings.conversionRate;
}

export function formatCurrencyWithSettings(amount: number | string): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount)) || 0;
  const settings = useSettingsStore.getState().settings;
  if (!settings) return `$${num.toFixed(2)}`;
  const rate = typeof settings.conversionRate === "number" ? settings.conversionRate : parseFloat(String(settings.conversionRate)) || 1;
  const converted = num * rate;
  return `${settings.currencySymbol}${converted.toFixed(2)}`;
}