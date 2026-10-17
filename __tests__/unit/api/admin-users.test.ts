/**
 * Unit tests for the admin users API routes.
 *
 * Tests:
 * - GET list requires ADMIN
 * - GET list returns users (search + role filter passthrough)
 * - PATCH requires ADMIN
 * - PATCH updates profile fields
 * - PATCH changes role
 * - PATCH rejects changing your own role
 * - PATCH rejects demoting the last admin
 * - PATCH rejects a Telegram chat already linked to another user
 * - PATCH binds / unbinds Telegram
 * - PATCH returns 404 for unknown user
 */

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/session", () => ({
  requireAdmin: jest.fn(),
}));

import { GET } from "@/app/api/admin/users/route";
import { PATCH } from "@/app/api/admin/users/[id]/route";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

const mockFindMany = db.user.findMany as jest.Mock;
const mockFindUnique = db.user.findUnique as jest.Mock;
const mockFindFirst = db.user.findFirst as jest.Mock;
const mockCount = db.user.count as jest.Mock;
const mockUpdate = db.user.update as jest.Mock;
const mockRequireAdmin = requireAdmin as jest.Mock;

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/admin/users/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/users", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not an admin", async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(401);
  });

  it("returns the user list for an admin", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindMany.mockResolvedValue([{ id: "u1", email: "a@b.com", role: "CUSTOMER" }]);

    const res = await GET(new Request("http://localhost/api/admin/users?search=jane"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not an admin", async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res = await PATCH(jsonRequest({ isVerified: true }), params("u1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown user", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue(null);
    const res = await PATCH(jsonRequest({ isVerified: true }), params("missing"));
    expect(res.status).toBe(404);
  });

  it("updates profile fields", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mockUpdate.mockResolvedValue({
      id: "u1",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      role: "CUSTOMER",
    });

    const res = await PATCH(
      jsonRequest({ firstName: "Jane", lastName: "Doe", phone: "555" }),
      params("u1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.data).toMatchObject({ firstName: "Jane", lastName: "Doe", phone: "555" });
    expect(updateArg.data).not.toHaveProperty("passwordHash");
  });

  it("changes a user's role", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mockUpdate.mockResolvedValue({ id: "u1", role: "STAFF" });

    const res = await PATCH(jsonRequest({ role: "STAFF" }), params("u1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.role).toBe("STAFF");
    expect(mockUpdate.mock.calls[0][0].data.role).toBe("STAFF");
  });

  it("rejects changing your own role", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const res = await PATCH(jsonRequest({ role: "CUSTOMER" }), params("admin-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("your own role");
  });

  it("rejects demoting the last admin", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "admin-2", role: "ADMIN" });
    mockCount.mockResolvedValue(1);

    const res = await PATCH(jsonRequest({ role: "CUSTOMER" }), params("admin-2"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("last admin");
  });

  it("rejects a Telegram chat already linked to another user", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mockFindFirst.mockResolvedValue({ id: "u2" });

    const res = await PATCH(jsonRequest({ telegramChatId: "999" }), params("u1"));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain("already linked");
  });

  it("binds a Telegram chat and opts the user in", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ id: "u1", telegramChatId: "999", telegramOptIn: true });

    const res = await PATCH(jsonRequest({ telegramChatId: "999" }), params("u1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdate.mock.calls[0][0].data).toMatchObject({
      telegramChatId: "999",
      telegramOptIn: true,
    });
    expect(data.data.telegramChatId).toBe("999");
  });

  it("unbinds a Telegram chat and opts the user out", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mockUpdate.mockResolvedValue({ id: "u1", telegramChatId: null, telegramOptIn: false });

    const res = await PATCH(jsonRequest({ telegramChatId: null }), params("u1"));

    expect(res.status).toBe(200);
    expect(mockUpdate.mock.calls[0][0].data).toMatchObject({
      telegramChatId: null,
      telegramOptIn: false,
    });
  });
});
