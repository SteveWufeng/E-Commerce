import { resolveBundleMix, normalizeProduct } from "@/lib/pricing";

const options = [
  { id: "a", quantity: 3, label: "Pack of 3", priceMode: "CUSTOM_TOTAL", totalPrice: "14" },
  { id: "b", quantity: 6, label: "Pack of 6", priceMode: "CUSTOM_TOTAL", totalPrice: "28" },
];

describe("bundle pricing", () => {
  it("uses bundle options when prices are numeric strings", () => {
    expect(resolveBundleMix("5", options as any, 3)).toEqual([
      { optionId: "a", optionLabel: "Pack of 3", quantity: 1, unitsPerOption: 3, unitPrice: 14, total: 14 },
    ]);
  });

  it("prefers larger packs when totals are equal", () => {
    expect(resolveBundleMix("5", options as any, 6)).toEqual([
      { optionId: "b", optionLabel: "Pack of 6", quantity: 1, unitsPerOption: 6, unitPrice: 28, total: 28 },
    ]);
  });

  it("combines packs and singles", () => {
    expect(resolveBundleMix("5", options as any, 4)).toEqual([
      { optionId: "a", optionLabel: "Pack of 3", quantity: 1, unitsPerOption: 3, unitPrice: 14, total: 14 },
      { optionId: null, optionLabel: null, quantity: 1, unitsPerOption: 1, unitPrice: 5, total: 5 },
    ]);
  });

  it("normalizes product and option prices", () => {
    const normalized = normalizeProduct({
      price: "5.25",
      comparePrice: "10",
      cost: null,
      options: [{ id: "a", totalPrice: "14" }],
    });

    expect(normalized.price).toBe(5.25);
    expect(normalized.comparePrice).toBe(10);
    expect(normalized.cost).toBeNull();
    expect(normalized.options[0].totalPrice).toBe(14);
  });
});
