import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/types";

function sameLine(
  a: { productId: string; optionId?: string | null },
  b: { productId: string; optionId?: string | null }
) {
  return a.productId === b.productId && (a.optionId ?? null) === (b.optionId ?? null);
}

interface CartState {
  items: CartItem[];
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, optionId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, optionId?: string | null) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((item) => sameLine(item, newItem));
          if (existing) {
            const newQty = Math.min(
              existing.quantity + (newItem.quantity || 1),
              newItem.maxStock
            );
            return {
              items: state.items.map((item) =>
                sameLine(item, newItem) ? { ...item, quantity: newQty } : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...newItem, quantity: newItem.quantity || 1 },
            ],
          };
        }),
      removeItem: (productId, optionId) =>
        set((state) => ({
          items: state.items.filter(
            (item) => !sameLine(item, { productId, optionId })
          ),
        })),
      updateQuantity: (productId, quantity, optionId) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (item) => !sameLine(item, { productId, optionId })
              ),
            };
          }
          return {
            items: state.items.map((item) =>
              sameLine(item, { productId, optionId })
                ? { ...item, quantity: Math.min(quantity, item.maxStock) }
                : item
            ),
          };
        }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "ecommerce-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

export function useCartCount() {
  const items = useCartStore((state) => state.items);
  return items.reduce((sum, item) => sum + item.quantity * (item.unitsPerOption || 1), 0);
}
