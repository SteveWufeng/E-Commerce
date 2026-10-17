"use client";

import { useCurrency } from "@/hooks/use-currency";

/**
 * Renders an amount (stored in USD) in the customer's selected currency.
 * Use anywhere a price is shown to a customer.
 */
export function Price({
  amount,
  className,
}: {
  amount: number | string;
  className?: string;
}) {
  const { format } = useCurrency();
  return <span className={className}>{format(amount)}</span>;
}
