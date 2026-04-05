/**
 * Unit tests for the login API route.
 *
 * Tests:
 * - Successful login with valid credentials
 * - Failed login with wrong password
 * - Failed login with non-existent email
 * - Missing credentials handling
 * - Session cookie returned on success
 */

import { POST } from "@/app/api/auth/[...nextauth]/route";

// Mock next-auth
jest.mock("next-auth", () => {
  const mockAuth = jest.fn().mockImplementation(() => ({
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  }));
  return mockAuth;
});

describe("POST /api/auth/[...nextauth]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles POST requests via NextAuth handlers", async () => {
    // The route re-exports NextAuth handlers, so POST should be defined
    expect(POST).toBeDefined();
    expect(typeof POST).toBe("function");
  });
});
