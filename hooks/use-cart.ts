/**
 * Cart state management using Zustand.
 *
 * Features:
 * - Add/remove items
 * - Update quantities
 * - Clear cart
 * - Persistent storage via localStorage
 * - Computed subtotal and item count
 *
 * Works for both guest and authenticated users.
 * On login, guest cart should be merged with user's persisted cart.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];

  // Computed values
  subtotal: number;
  itemCount: number;

  // Actions
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
      get subtotal() {
        return calculateSubtotal(get().items);
      },
      get itemCount() {
        return calculateItemCount(get().items);
      },

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
      // Only persist items, computed values are derived
      partialize: (state) => ({ items: state.items }),
    }
  )
);
