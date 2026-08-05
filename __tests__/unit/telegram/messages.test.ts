/**
 * Unit tests for the Telegram notification message builder.
 */

import { buildOrderMessage, buildOrderButtons } from "@/lib/telegram";

const baseOrder = {
  id: "order-1",
  orderNumber: "ORD-20260805-0001",
  status: "CONFIRMED",
  total: "$123.45",
  paymentMethod: "Bank Transfer",
  customerFirstName: "John",
  items: [
    { name: "Widget", quantity: 2, price: "$10.00" },
    { name: "Gadget", quantity: 1, price: "$5.00" },
  ],
  storeName: "Super Todos",
  storeAddress: "123 Main St",
};

describe("buildOrderMessage", () => {
  it("builds a CONFIRMED message with order number, items and total", () => {
    const msg = buildOrderMessage(baseOrder);

    expect(msg).toContain("Order Confirmed");
    expect(msg).toContain("ORD-20260805-0001");
    expect(msg).toContain("Widget ×2 — $10.00");
    expect(msg).toContain("$123.45");
    expect(msg).toContain("Bank Transfer");
  });

  it("builds a READY_FOR_PICKUP message with store info", () => {
    const msg = buildOrderMessage({ ...baseOrder, status: "READY_FOR_PICKUP" });

    expect(msg).toContain("Ready for Pickup");
    expect(msg).toContain("ORD-20260805-0001");
    expect(msg).toContain("Super Todos");
    expect(msg).toContain("123 Main St");
  });

  it("builds a PICKED_UP message greeting the customer", () => {
    const msg = buildOrderMessage({ ...baseOrder, status: "PICKED_UP" });

    expect(msg).toContain("Order Picked Up");
    expect(msg).toContain("John");
  });

  it("builds a CANCELLED message", () => {
    const msg = buildOrderMessage({ ...baseOrder, status: "CANCELLED" });

    expect(msg).toContain("Order Cancelled");
    expect(msg).toContain("ORD-20260805-0001");
  });

  it("includes the rejection reason in a REJECTED message", () => {
    const msg = buildOrderMessage({
      ...baseOrder,
      status: "REJECTED",
      rejectionReason: "Payment not received",
    });

    expect(msg).toContain("Order Rejected");
    expect(msg).toContain("Payment not received");
  });

  it("falls back to a generic status message", () => {
    const msg = buildOrderMessage({ ...baseOrder, status: "PENDING" });

    expect(msg).toContain("pending");
  });
});

describe("buildOrderButtons", () => {
  it("returns a View Order button linking to the order page", () => {
    const buttons = buildOrderButtons("ORD-20260805-0001");

    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe("View Order Details");
    expect(buttons[0].url).toContain("/orders/ORD-20260805-0001");
  });
});
