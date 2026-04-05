/**
 * Unit tests for the profile API route.
 *
 * Tests:
 * - Returns user profile for authenticated requests
 * - Returns 401 for unauthenticated requests
 * - Does not return password hash
 * - Returns 404 for non-existent user
 */

import { GET } from "@/app/api/auth/me/route";

// Mock the database
jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const mockFindUnique = db.user.findUnique as jest.Mock;
const mockAuth = auth as jest.Mock;

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns user profile for authenticated requests", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "John Doe",
      },
    });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      phone: "1234567890",
      role: "CUSTOMER",
      isVerified: false,
      createdAt: new Date(),
    });

    const request = new Request("http://localhost/api/auth/me");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.email).toBe("test@example.com");
    expect(data.data.firstName).toBe("John");
    expect(data.data.lastName).toBe("Doe");
    expect(data.data.role).toBe("CUSTOMER");
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/me");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("does not return passwordHash in response", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "John Doe",
      },
    });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      phone: null,
      role: "CUSTOMER",
      isVerified: false,
      createdAt: new Date(),
    });

    const request = new Request("http://localhost/api/auth/me");
    const response = await GET(request);
    const data = await response.json();

    expect(data.data).not.toHaveProperty("passwordHash");
    expect(data.data).not.toHaveProperty("password");
  });

  it("returns 404 for non-existent user", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "ghost-user",
        email: "ghost@example.com",
        name: "Ghost",
      },
    });
    mockFindUnique.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/me");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });
});
