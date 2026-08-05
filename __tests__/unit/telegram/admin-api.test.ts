/**
 * Unit tests for the admin Telegram configuration API.
 *
 * Tests:
 * - GET requires admin (401 for non-admin)
 * - POST saves config and never leaks the raw token
 * - test connection endpoint validates tokens
 */

import { GET, POST } from "@/app/api/admin/telegram/route";
import { POST as TEST_POST } from "@/app/api/admin/telegram/test/route";

jest.mock("@/lib/auth/session", () => ({
  requireAdmin: jest.fn(),
}));

jest.mock("@/lib/telegram", () => ({
  getTelegramConfig: jest.fn(),
  saveTelegramConfig: jest.fn(),
  testTelegramConnection: jest.fn(),
}));

import { requireAdmin } from "@/lib/auth/session";
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
} from "@/lib/telegram";

const mockRequireAdmin = requireAdmin as jest.Mock;
const mockGetConfig = getTelegramConfig as jest.Mock;
const mockSaveConfig = saveTelegramConfig as jest.Mock;
const mockTestConnection = testTelegramConnection as jest.Mock;

describe("Admin Telegram config API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns config with the token masked", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { role: "ADMIN" } });
    mockGetConfig.mockResolvedValue({
      enabled: true,
      botToken: "secret-token-123",
      botUsername: "@MyStoreBot",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.hasBotToken).toBe(true);
    expect(data.data.enabled).toBe(true);
    expect(data.data.botUsername).toBe("@MyStoreBot");
    expect(data.data.botToken).toBeUndefined();
  });

  it("GET returns 401 for non-admin", async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Admin required");
  });

  it("POST saves the config and returns masked state", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { role: "ADMIN" } });
    mockGetConfig.mockResolvedValue({
      enabled: true,
      botToken: "new-token",
      botUsername: "@MyStoreBot",
    });

    const request = new Request("http://localhost/api/admin/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true, botUsername: "@MyStoreBot", botToken: "new-token" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(mockSaveConfig).toHaveBeenCalledWith({
      enabled: true,
      botUsername: "@MyStoreBot",
      botToken: "new-token",
    });
    expect(response.status).toBe(200);
    expect(data.data.hasBotToken).toBe(true);
    expect(data.data.botToken).toBeUndefined();
  });

  it("test endpoint returns success with bot username for a valid token", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { role: "ADMIN" } });
    mockTestConnection.mockResolvedValue({ ok: true, botUsername: "MyStoreBot" });

    const request = new Request("http://localhost/api/admin/telegram/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botToken: "good-token" }),
    });

    const response = await TEST_POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.botUsername).toBe("MyStoreBot");
  });

  it("test endpoint returns 400 for a rejected token", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { role: "ADMIN" } });
    mockTestConnection.mockResolvedValue({ ok: false, error: "Unauthorized" });

    const request = new Request("http://localhost/api/admin/telegram/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botToken: "bad-token" }),
    });

    const response = await TEST_POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
