/**
 * Unit tests for the logout API route.
 *
 * Tests:
 * - Successful sign-out returns success
 * - Custom callback URL is respected
 * - Default callback URL is home page
 */

import { POST } from "@/app/api/auth/logout/route";

// Mock auth
jest.mock("@/lib/auth", () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

import { signOut } from "@/lib/auth";

const mockSignOut = signOut as jest.Mock;

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs out successfully with default callback", async () => {
    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.callbackUrl).toBe("/");
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
  });

  it("respects custom callback URL", async () => {
    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callbackUrl: "/login" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.callbackUrl).toBe("/login");
  });

  it("handles empty body gracefully", async () => {
    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
