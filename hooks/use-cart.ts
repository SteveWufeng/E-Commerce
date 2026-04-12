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
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          // Use setTimeout to ensure this runs after hydration completes
          setTimeout(() => {
            state?.setHydrated(true);
          }, 0);
        }
      },
    }
  )
);

/**
 * Hook to ensure cart is hydrated before using.
 * Returns both hydrated state and items - use hydrated to prevent flash of empty cart.
 */
export function useHydratedCart() {
  const hydrated = useCartStore((state) => state.hydrated);
  const items = useCartStore((state) => state.items);
  return { hydrated, items };
}

/**
 * Hook to get cart item count only - optimized for header badge updates.
 * Returns 0 until hydrated to prevent showing wrong count.
 */
export function useCartCount() {
  const hydrated = useCartStore((state) => state.hydrated);
  const itemCount = useCartStore((state) => state.itemCount);
  return hydrated ? itemCount : 0;
}
