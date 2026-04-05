/**
 * Unit tests for the admin user creation API route.
 *
 * Tests:
 * - Admin can create new admin users
 * - Non-admin users are rejected (403)
 * - Unauthenticated requests are rejected (401)
 * - Duplicate email rejection
 * - Password length enforcement (min 8 for admins)
 * - Input validation
 */

import { POST } from "@/app/api/auth/admin/create/route";

// Mock the database
jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2b$12$mockedadminhashedpassword1234567890abcdef"),
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const mockFindUnique = db.user.findUnique as jest.Mock;
const mockCreate = db.user.create as jest.Mock;
const mockAuth = auth as jest.Mock;

describe("POST /api/auth/admin/create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new admin user when requester is admin", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@store.com",
        name: "Admin User",
        role: "ADMIN",
      },
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "admin-2",
      email: "newadmin@store.com",
      firstName: "New",
      lastName: "Admin",
      role: "ADMIN",
    });

    const request = new Request("http://localhost/api/auth/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "New",
        lastName: "Admin",
        email: "newadmin@store.com",
        password: "securepassword123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.role).toBe("ADMIN");
  });

  it("rejects non-admin users with 403", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "customer-1",
        email: "customer@example.com",
        name: "Customer",
        role: "CUSTOMER",
      },
    });

    const request = new Request("http://localhost/api/auth/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Hacker",
        lastName: "User",
        email: "hacker@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("admin access required");
  });

  it("rejects unauthenticated requests with 401", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Hacker",
        lastName: "User",
        email: "hacker@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("rejects duplicate email with 409", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@store.com",
        name: "Admin User",
        role: "ADMIN",
      },
    });
    mockFindUnique.mockResolvedValue({
      id: "existing-admin",
      email: "existing@store.com",
    });

    const request = new Request("http://localhost/api/auth/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Existing",
        lastName: "Admin",
        email: "existing@store.com",
        password: "securepassword123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("An account with this email already exists");
  });

  it("rejects admin password shorter than 8 characters", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@store.com",
        name: "Admin User",
        role: "ADMIN",
      },
    });

    const request = new Request("http://localhost/api/auth/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "New",
        lastName: "Admin",
        email: "newadmin@store.com",
        password: "short",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("8 characters");
  });

  it("does not return passwordHash in response", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@store.com",
        name: "Admin User",
        role: "ADMIN",
      },
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "admin-2",
      email: "newadmin@store.com",
      firstName: "New",
      lastName: "Admin",
      role: "ADMIN",
    });

    const request = new Request("http://localhost/api/auth/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "New",
        lastName: "Admin",
        email: "newadmin@store.com",
        password: "securepassword123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data).not.toHaveProperty("passwordHash");
    expect(data.data).not.toHaveProperty("password");
  });
});
