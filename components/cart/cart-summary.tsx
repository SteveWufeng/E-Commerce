import { formatCurrency } from "@/lib/utils";

/**
 * Cart summary — displays subtotal, tax, and total.
 * Used on both cart page and checkout page.
 */
export function CartSummary({
  subtotal,
  tax,
  total,
  itemCount,
}: {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Order Summary
      </h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax (estimated)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold text-gray-900 text-base">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Tax is calculated at checkout. Final amount may vary.
      </p>
    </div>
  );
}
