import { z } from "zod";

export type PriceMode = "SAME_UNIT_PRICE" | "CUSTOM_TOTAL";

export interface BundleOptionInput {
  quantity: number;
  label?: string | null;
  priceMode: PriceMode;
  totalPrice?: number | null;
}

export const bundleOptionSchema = z
  .object({
    quantity: z.number().int().min(2),
    label: z.string().max(100).nullable().optional(),
    priceMode: z.enum(["SAME_UNIT_PRICE", "CUSTOM_TOTAL"]),
    totalPrice: z.number().positive().nullable().optional(),
  })
  .refine(
    (o) => o.priceMode !== "CUSTOM_TOTAL" || (o.totalPrice != null && o.totalPrice > 0),
    { message: "Custom total price requires a positive totalPrice", path: ["totalPrice"] }
  );

export const bundleOptionsSchema = z
  .array(bundleOptionSchema)
  .refine((opts) => new Set(opts.map((o) => o.quantity)).size === opts.length, {
    message: "Duplicate pack quantities are not allowed",
  });

export function optionToDbData(o: BundleOptionInput, productId: string, sortOrder: number) {
  return {
    productId,
    quantity: o.quantity,
    label: o.label ?? null,
    priceMode: o.priceMode,
    totalPrice: o.priceMode === "CUSTOM_TOTAL" ? o.totalPrice ?? null : null,
    sortOrder,
  };
}

export interface BundleOption {
  id: string;
  quantity: number;
  label: string | null;
  priceMode: PriceMode;
  totalPrice: number | null;
}

export interface MixLine {
  optionId: string | null; // null = single-unit line
  optionLabel: string | null;
  quantity: number; // number of packs (or units for the single line)
  unitsPerOption: number; // 1 for single line, pack size for bundle lines
  unitPrice: number; // price per line unit (per pack, or per single unit)
  total: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function packTotalPrice(option: BundleOption, unitPrice: number): number {
  if (option.priceMode === "CUSTOM_TOTAL" && option.totalPrice != null) {
    return round2(option.totalPrice);
  }
  return round2(option.quantity * unitPrice);
}

export function mixTotal(lines: MixLine[]): number {
  return round2(lines.reduce((sum, line) => sum + line.total, 0));
}

/**
 * Finds the cheapest way to fulfill exactly `totalUnits` using single units
 * at `unitPrice` and the given bundle packs (unbounded knapsack DP).
 * Returns one line per distinct option used (optionId = null for singles).
 */
export function resolveBundleMix(
  unitPrice: number,
  options: BundleOption[],
  totalUnits: number
): MixLine[] {
  if (totalUnits <= 0) return [];

  const price = round2(unitPrice);
  const packs = options.filter(
    (o) => Number.isInteger(o.quantity) && o.quantity >= 2
  );

  if (packs.length === 0) {
    return [
      {
        optionId: null,
        optionLabel: null,
        quantity: totalUnits,
        unitsPerOption: 1,
        unitPrice: price,
        total: round2(price * totalUnits),
      },
    ];
  }

  const items: { key: string | null; qty: number; cost: number }[] = [
    { key: null, qty: 1, cost: price },
    ...packs.map((o) => ({ key: o.id, qty: o.quantity, cost: packTotalPrice(o, unitPrice) })),
  ];

  const dp: number[] = new Array(totalUnits + 1).fill(Infinity);
  const choice: number[] = new Array(totalUnits + 1).fill(-1);
  dp[0] = 0;

  for (let n = 1; n <= totalUnits; n++) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.qty <= n && dp[n - it.qty] + it.cost < dp[n]) {
        dp[n] = dp[n - it.qty] + it.cost;
        choice[n] = i;
      }
    }
  }

  const counts = new Map<string | null, number>();
  let n = totalUnits;
  while (n > 0) {
    const idx = choice[n];
    if (idx === -1) break;
    const it = items[idx];
    counts.set(it.key, (counts.get(it.key) ?? 0) + 1);
    n -= it.qty;
  }

  const lines: MixLine[] = [];
  counts.forEach((count, key) => {
    if (key === null) {
      lines.push({
        optionId: null,
        optionLabel: null,
        quantity: count,
        unitsPerOption: 1,
        unitPrice: price,
        total: round2(price * count),
      });
    } else {
      const o = packs.find((p) => p.id === key)!;
      const packPrice = packTotalPrice(o, unitPrice);
      lines.push({
        optionId: o.id,
        optionLabel: o.label,
        quantity: count,
        unitsPerOption: o.quantity,
        unitPrice: packPrice,
        total: round2(packPrice * count),
      });
    }
  });

  // Sort: largest packs first, singles last
  lines.sort((a, b) => b.unitsPerOption - a.unitsPerOption);
  return lines;
}
