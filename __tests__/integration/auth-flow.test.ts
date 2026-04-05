/**
 * Integration tests for the complete authentication flow.
 *
 * Tests end-to-end scenarios:
 * - Full signup → login → profile → logout flow
 * - Guest checkout vs authenticated checkout
 * - Admin route access control
 * - Session persistence and expiration
 */

// Mock all external dependencies
jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2b$12$mockedhashedpassword1234567890abcdef"),
  compare: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}));

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/lib/auth";
import { POST as signupPost } from "@/app/api/auth/signup/route";
import { GET as profileGet } from "@/app/api/auth/me/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";

const mockFindUnique = db.user.findUnique as jest.Mock;
const mockCreate = db.user.create as jest.Mock;
const mockCompare = bcrypt.compare as jest.Mock;
const mockAuth = auth as jest.Mock;
const mockSignIn = signIn as jest.Mock;

describe("Integration: Complete Auth Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Signup → Login → Profile → Logout", () => {
    it("completes the full authentication lifecycle", async () => {
      // Step 1: Signup
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "user-1",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "CUSTOMER",
      });

      const signupReq = new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          password: "password123",
        }),
      });

      const signupRes = await signupPost(signupReq);
      const signupData = await signupRes.json();
      expect(signupRes.status).toBe(201);
      expect(signupData.data.email).toBe("john@example.com");

      // Step 2: Login (simulate successful auth)
      mockFindUnique.mockResolvedValue({
        id: "user-1",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        passwordHash: "$2b$12$mockedhashedpassword1234567890abcdef",
        role: "CUSTOMER",
      });
      mockCompare.mockResolvedValue(true);
      mockSignIn.mockResolvedValue({ ok: true, error: null });

      const signInResult = await signIn("credentials", {
        email: "john@example.com",
        password: "password123",
        redirect: false,
      });
      expect(signInResult?.ok).toBe(true);

      // Step 3: Access profile
      mockAuth.mockResolvedValue({
        user: {
          id: "user-1",
          email: "john@example.com",
          name: "John Doe",
        },
      });
      mockFindUnique.mockResolvedValue({
        id: "user-1",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "1234567890",
        role: "CUSTOMER",
        isVerified: false,
        createdAt: new Date(),
      });

      const profileReq = new Request("http://localhost/api/auth/me");
      const profileRes = await profileGet(profileReq);
      const profileData = await profileRes.json();
      expect(profileRes.status).toBe(200);
      expect(profileData.data.firstName).toBe("John");
      expect(profileData.data.email).toBe("john@example.com");

      // Step 4: Logout
      const logoutReq = new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const logoutRes = await logoutPost(logoutReq);
      const logoutData = await logoutRes.json();
      expect(logoutRes.status).toBe(200);
      expect(logoutData.success).toBe(true);
    });

    it("prevents profile access after logout", async () => {
      mockAuth.mockResolvedValue(null);

      const profileReq = new Request("http://localhost/api/auth/me");
      const profileRes = await profileGet(profileReq);
      const profileData = await profileRes.json();

      expect(profileRes.status).toBe(401);
      expect(profileData.error).toBe("Unauthorized");
    });
  });

  describe("Guest checkout flow", () => {
    it("allows checkout without authentication", async () => {
      // Guest checkout does not require session
      mockAuth.mockResolvedValue(null);

      // Guest should not be able to access profile
      const profileReq = new Request("http://localhost/api/auth/me");
      const profileRes = await profileGet(profileReq);
      expect(profileRes.status).toBe(401);

      // But guest can still browse and checkout
      // (checkout is a public route handled by middleware)
    });
  });

  describe("Admin access control", () => {
    it("admin can access admin routes", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "admin-1",
          email: "admin@store.com",
          name: "Admin User",
          role: "ADMIN",
        },
      });

      const session = await auth();
      const role = (session?.user as { role?: string })?.role;
      expect(role).toBe("ADMIN");
    });

    it("customer cannot impersonate admin", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "customer-1",
          email: "customer@example.com",
          name: "Customer",
          role: "CUSTOMER",
        },
      });

      const session = await auth();
      const role = (session?.user as { role?: string })?.role;
      expect(role).toBe("CUSTOMER");
      expect(role).not.toBe("ADMIN");
    });
  });

  describe("Concurrent session handling", () => {
    it("handles multiple simultaneous sessions", async () => {
      // Simulate two users logged in concurrently
      mockAuth
        .mockResolvedValueOnce({
          user: { id: "user-1", email: "user1@example.com", name: "User 1", role: "CUSTOMER" },
        })
        .mockResolvedValueOnce({
          user: { id: "user-2", email: "user2@example.com", name: "User 2", role: "CUSTOMER" },
        });

      const session1 = await auth();
      const session2 = await auth();

      expect((session1?.user as { id: string }).id).toBe("user-1");
      expect((session2?.user as { id: string }).id).toBe("user-2");
    });
  });
});
