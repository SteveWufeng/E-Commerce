/**
 * Unit tests for the Telegram notification message builder.
 */

import { buildOrderMessage, buildOrderButtons, buildHelpMessage, buildOrdersListMessage, buildOrderStatusMessage, buildNewOrderAdminMessage, buildAdminCancellationMessage, buildAdminPaymentUpdateMessage, buildCustomerMessageNotification, buildAdminReplyMessage, buildAdminOrderButtons, statusEmoji, statusLabel, escapeHtml } from "@/lib/telegram";

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
  storeName: "Buhoya",
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
    expect(msg).toContain("Buhoya");
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

  it("builds a PAYMENT_PROOF_REJECTED message asking to re-upload", () => {
    const msg = buildOrderMessage(
      {
        ...baseOrder,
        status: "PENDING",
        rejectionReason: "Blurry receipt",
      },
      null,
      "PAYMENT_PROOF_REJECTED"
    );

    expect(msg).toContain("Payment proof needs attention");
    expect(msg).toContain("ORD-20260805-0001");
    expect(msg).toContain("Blurry receipt");
    expect(msg).toContain("re-upload");
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

describe("buildHelpMessage", () => {
  it("lists the /orders and /help commands", () => {
    const msg = buildHelpMessage("Buhoya");

    expect(msg).toContain("Buhoya");
    expect(msg).toContain("/orders");
    expect(msg).toContain("/help");
  });
});

describe("buildOrdersListMessage", () => {
  it("renders each order with a normalised status, total and date", () => {
    const msg = buildOrdersListMessage([
      {
        orderNumber: "ORD-20260805-0001",
        status: "READY_FOR_PICKUP",
        total: { toString: () => "123.45" },
        createdAt: new Date("2026-08-05T12:00:00Z"),
      },
    ]);

    expect(msg).toContain("Your recent orders");
    expect(msg).toContain("ORD-20260805-0001");
    expect(msg).toContain("ready for pickup");
    expect(msg).toContain("$123.45");
  });

  it("uses the supplied currency symbol", () => {
    const msg = buildOrdersListMessage(
      [
        {
          orderNumber: "ORD-1",
          status: "PENDING",
          total: "9.50",
          createdAt: new Date("2026-08-05T12:00:00Z"),
        },
      ],
      "Bs."
    );

    expect(msg).toContain("Bs.9.50");
  });
});

describe("buildHelpMessage", () => {
  it("adds the /order command for admins", () => {
    const msg = buildHelpMessage("Buhoya", true);
    expect(msg).toContain("/order");
    expect(msg).toContain("store");
  });
});

describe("buildOrderStatusMessage", () => {
  const order = {
    orderNumber: "ORD-20260805-0002",
    status: "READY_FOR_PICKUP",
    paymentStatus: "COMPLETED",
    total: { toString: () => "55.00" },
    createdAt: new Date("2026-08-05T12:00:00Z"),
    customerFirstName: "Jane",
    items: [
      { productName: "Widget", productPrice: { toString: () => "10.00" }, quantity: 3 },
      { productName: "Gadget", productPrice: "25.00", quantity: 1 },
    ],
  };

  it("renders a neutral status report with items and total", () => {
    const msg = buildOrderStatusMessage(order);
    expect(msg).toContain("ORD-20260805-0002");
    expect(msg).toContain("ready for pickup");
    expect(msg).toContain("Payment: completed");
    expect(msg).toContain("Widget ×3 — $10.00");
    expect(msg).toContain("$55.00");
    expect(msg).not.toContain("Jane");
  });

  it("includes the customer name in admin mode", () => {
    const msg = buildOrderStatusMessage(order, { forAdmin: true });
    expect(msg).toContain("Customer: Jane");
  });
});

describe("admin notification builders", () => {
  const order = {
    orderNumber: "ORD-20260805-0009",
    status: "PENDING",
    paymentStatus: "PENDING",
    total: 42.5,
    paymentMethod: "Mercantil Payment",
    createdAt: new Date("2026-08-05T12:00:00Z"),
    customerFirstName: "Jane",
    customerLastName: "Doe",
    customerEmail: "jane@example.com",
    customerPhone: "+580000000",
    items: [
      { productName: "Widget", productPrice: 10, quantity: 3 },
      { productName: "Gadget", productPrice: 12.5, quantity: 1 },
    ],
  };

  it("builds a new-order admin message with customer, total and items", () => {
    const msg = buildNewOrderAdminMessage(order);
    expect(msg).toContain("New order");
    expect(msg).toContain("ORD-20260805-0009");
    expect(msg).toContain("Jane Doe");
    expect(msg).toContain("jane@example.com");
    expect(msg).toContain("$42.50");
    expect(msg).toContain("Widget ×3 — $10.00");
  });

  it("honours a custom currency symbol in the new-order message", () => {
    const msg = buildNewOrderAdminMessage(order, { currencySymbol: "Bs." });
    expect(msg).toContain("Bs.42.50");
    expect(msg).toContain("Bs.10.00");
  });

  it("builds a cancellation alert", () => {
    const msg = buildAdminCancellationMessage(order);
    expect(msg).toContain("Order cancelled");
    expect(msg).toContain("ORD-20260805-0009");
    expect(msg).toContain("Jane");
  });

  it("builds a payment update alert including the detail", () => {
    const msg = buildAdminPaymentUpdateMessage(
      { ...order, paymentStatus: "COMPLETED" },
      "Payment approved via Mercantil."
    );
    expect(msg).toContain("Payment update");
    expect(msg).toContain("Payment approved via Mercantil.");
    expect(msg).toContain("Payment: completed");
  });

  it("builds a customer-message notification with body and reply hint", () => {
    const msg = buildCustomerMessageNotification("Jane Doe", "Where is my order?", "Reply via dashboard");
    expect(msg).toContain("New message");
    expect(msg).toContain("Jane Doe");
    expect(msg).toContain("Where is my order?");
    expect(msg).toContain("Reply via dashboard");
  });

  it("builds an admin reply message for the customer", () => {
    const msg = buildAdminReplyMessage("Admin Ann", "It ships today.");
    expect(msg).toContain("Admin Ann");
    expect(msg).toContain("It ships today.");
  });
});

describe("buildAdminOrderButtons", () => {
  it("offers Confirm and Cancel for a PENDING order", () => {
    const buttons = buildAdminOrderButtons("ORD-1", "PENDING");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].callbackData).toBe("ord:confirm:ORD-1");
    expect(buttons[1].callbackData).toBe("ord:cancel:ORD-1");
    expect(buttons[0].url).toBeUndefined();
  });

  it("offers Ready and Cancel for a CONFIRMED order", () => {
    const buttons = buildAdminOrderButtons("ORD-1", "CONFIRMED");
    expect(buttons.map((b) => b.callbackData)).toEqual([
      "ord:ready:ORD-1",
      "ord:cancel:ORD-1",
    ]);
  });

  it("offers only Picked up for a READY_FOR_PICKUP order", () => {
    const buttons = buildAdminOrderButtons("ORD-1", "READY_FOR_PICKUP");
    expect(buttons.map((b) => b.callbackData)).toEqual(["ord:pickedup:ORD-1"]);
  });

  it("offers no actions for a terminal state", () => {
    expect(buildAdminOrderButtons("ORD-1", "PICKED_UP")).toEqual([]);
  });
});

describe("status helpers", () => {
  it("maps known statuses to emojis and normalises labels", () => {
    expect(statusEmoji("CONFIRMED")).toBe("✅");
    expect(statusEmoji("UNKNOWN")).toBe("ℹ️");
    expect(statusLabel("READY_FOR_PICKUP")).toBe("ready for pickup");
  });
});

describe("HTML safety", () => {
  it("escapeHtml neutralises tags and ampersands", () => {
    expect(escapeHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
    expect(escapeHtml("<number>")).toBe("&lt;number&gt;");
    expect(escapeHtml(null)).toBe("");
  });

  it("help messages never contain raw angle-bracket placeholders", () => {
    expect(buildHelpMessage("Store")).not.toMatch(/<(number|order number|reason|message)>/);
    expect(buildHelpMessage("Store", true)).not.toMatch(/<(number|order number|reason|message)>/);
  });

  it("escapes user-controlled content in outbound messages", () => {
    const notif = buildCustomerMessageNotification(
      "Ann <script>",
      "price < 5 & rising",
      "Reply in the dashboard"
    );
    expect(notif).toContain("Ann &lt;script&gt;");
    expect(notif).toContain("price &lt; 5 &amp; rising");
    expect(notif).not.toContain("<script>");

    const reply = buildAdminReplyMessage("Bob <admin>", "use <b> tags");
    expect(reply).toContain("Bob &lt;admin&gt;");
    expect(reply).toContain("use &lt;b&gt; tags");
  });

  it("escapes dynamic fields in order messages", () => {
    const msg = buildOrderMessage({
      ...baseOrder,
      items: [{ name: "Coke <2L>", quantity: 1, price: "$3.00" }],
    });
    expect(msg).toContain("Coke &lt;2L&gt;");
    expect(msg).not.toContain("Coke <2L>");
  });
});
