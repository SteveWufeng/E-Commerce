import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

/**
 * Cart store with localStorage persistence.
 * Uses hydration flag to prevent SSR mismatch issues.
 */

interface CartState {
  items: CartItem[];

  // Hydration tracking - set to true after client-side hydration
  hydrated: boolean;

  // Computed values
  subtotal: number;
  itemCount: number;

  // Actions
  setHydrated: (hydrated: boolean) => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function calculateItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,

      get subtotal() {
        return calculateSubtotal(get().items);
      },
      get itemCount() {
        return calculateItemCount(get().items);
      },

      setHydrated: (hydrated) => set({ hydrated }),

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find(
            (item) => item.productId === newItem.productId
          );

          if (existing) {
            const newQty = Math.min(
              existing.quantity + (newItem.quantity || 1),
              newItem.maxStock
            );
            return {
              items: state.items.map((item) =>
                item.productId === newItem.productId
                  ? { ...item, quantity: newQty }
                  : item
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

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.productId !== productId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.min(quantity, item.maxStock) }
                : item
            ),
          };
        }),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "ecommerce-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Initialize hydration flag after persist loads
if (typeof window !== "undefined") {
  useCartStore.setState({ hydrated: true });
}

/**
 * Hook to get cart item count - returns 0 during SSR to prevent mismatch.
 */
export function useCartCount() {
  const itemCount = useCartStore((state) => state.itemCount);
  return itemCount;
}
