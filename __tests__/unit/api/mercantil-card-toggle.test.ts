/**
 * Tests for the mercantilCardEnabled toggle:
 * - Settings API persists the flag
 * - Card payment routes reject when disabled
 */

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    settings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/session", () => ({
  requireAdmin: jest.fn(),
}));

jest.mock("@/lib/payments/mercantil-card", () => ({
  confirmPayment: jest.fn(),
  requestAuth: jest.fn(),
}));

import { POST as updateSettings } from "@/app/api/settings/route";
import { POST as pay } from "@/app/api/payments/mercantil/pay/route";
import { POST as getauth } from "@/app/api/payments/mercantil/getauth/route";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const mockFindFirst = db.settings.findFirst as jest.Mock;
const mockUpdate = db.settings.update as jest.Mock;
const mockRequireAdmin = requireAdmin as jest.Mock;

describe("POST /api/settings (mercantilCardEnabled)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects non-admins", async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res = await updateSettings(
      new Request("http://localhost/api/settings", {
        method: "POST",
        body: JSON.stringify({ mercantilCardEnabled: false }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("persists the flag when toggled off", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    mockFindFirst.mockResolvedValue({
      id: "s1",
      storeName: "Store",
      storeAddress: "",
      currencyCode: "USD",
      currencySymbol: "$",
      conversionRate: 1,
      mercantilRedirectEnabled: false,
      mercantilCardEnabled: true,
    });
    mockUpdate.mockResolvedValue({ id: "s1", mercantilCardEnabled: false });

    const res = await updateSettings(
      new Request("http://localhost/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mercantilCardEnabled: false }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpdate.mock.calls[0][0].data.mercantilCardEnabled).toBe(false);
  });
});

describe("card payment routes gated by mercantilCardEnabled", () => {
  beforeEach(() => jest.clearAllMocks());

  it("pay returns 400 when card payments are disabled", async () => {
    mockFindFirst.mockResolvedValue({ mercantilCardEnabled: false });
    const res = await pay(
      new Request("http://localhost/api/payments/mercantil/pay", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("disabled");
  });

  it("getauth returns 400 when card payments are disabled", async () => {
    mockFindFirst.mockResolvedValue({ mercantilCardEnabled: false });
    const res = await getauth(
      new Request("http://localhost/api/payments/mercantil/getauth", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });
});
