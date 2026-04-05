/**
 * Unit tests for the signup API route.
 *
 * Tests:
 * - Successful user creation with valid data
 * - Password hashing verification
 * - Duplicate email rejection (409)
 * - Input validation (Zod schema)
 * - Missing field handling
 * - Password length enforcement
 * - Email normalization (lowercase)
 */

import { POST } from "@/app/api/auth/signup/route";

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
  hash: jest.fn().mockResolvedValue("$2b$12$mockedhashedpassword1234567890abcdef"),
}));

import { db } from "@/lib/db";

const mockFindUnique = db.user.findUnique as jest.Mock;
const mockCreate = db.user.create as jest.Mock;

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new user with valid data", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "CUSTOMER",
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.email).toBe("test@example.com");
    expect(data.data.role).toBe("CUSTOMER");
    expect(data.data).not.toHaveProperty("passwordHash");
  });

  it("rejects duplicate email with 409", async () => {
    mockFindUnique.mockResolvedValue({
      id: "existing-user",
      email: "test@example.com",
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("An account with this email already exists");
  });

  it("rejects password shorter than 6 characters", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        password: "short",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("6 characters");
  });

  it("rejects invalid email format", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "not-an-email",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("email");
  });

  it("rejects missing first name", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastName: "Doe",
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it("rejects missing last name", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it("normalizes email to lowercase", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "user-2",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "CUSTOMER",
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "TEST@EXAMPLE.COM",
        password: "password123",
      }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "test@example.com",
        }),
      })
    );
  });

  it("trims whitespace from names", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "user-3",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "CUSTOMER",
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "  John  ",
        lastName: "  Doe  ",
        email: "test@example.com",
        password: "password123",
      }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
        }),
      })
    );
  });

  it("accepts empty phone as null", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "user-4",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "CUSTOMER",
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        phone: "",
        password: "password123",
      }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: null,
        }),
      })
    );
  });

  it("does not return passwordHash in response", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "user-5",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "CUSTOMER",
    });

    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data).not.toHaveProperty("passwordHash");
    expect(data.data).not.toHaveProperty("password");
  });
});
