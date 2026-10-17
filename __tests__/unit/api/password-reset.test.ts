/**
 * Unit tests for the password reset API routes.
 *
 * - Admin link generation is ADMIN-only
 * - Public token validation
 * - Public password reset
 */

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/session", () => ({
  requireAdmin: jest.fn(),
}));

jest.mock("@/lib/auth/password-reset", () => ({
  createPasswordResetToken: jest.fn(),
  validatePasswordResetToken: jest.fn(),
  resetPasswordWithToken: jest.fn(),
  PASSWORD_RESET_TTL_MINUTES: 60,
}));

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  passwordResetEmail: jest.fn().mockReturnValue({ to: "", subject: "", html: "" }),
}));

import { POST as generateReset } from "@/app/api/admin/users/[id]/password-reset/route";
import { GET as validateReset, POST as submitReset } from "@/app/api/auth/reset-password/route";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import {
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/auth/password-reset";
import { sendEmail } from "@/lib/email";

const mockFindUnique = db.user.findUnique as jest.Mock;
const mockRequireAdmin = requireAdmin as jest.Mock;
const mockCreateToken = createPasswordResetToken as jest.Mock;
const mockValidate = validatePasswordResetToken as jest.Mock;
const mockReset = resetPasswordWithToken as jest.Mock;
const mockSendEmail = sendEmail as jest.Mock;

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/admin/users/[id]/password-reset", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not an admin", async () => {
    mockRequireAdmin.mockResolvedValue(null);
    const res = await generateReset(
      new Request("http://localhost/api/admin/users/u1/password-reset", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      params("u1")
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown user", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue(null);
    const res = await generateReset(
      new Request("http://localhost/api/admin/users/missing/password-reset", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      params("missing")
    );
    expect(res.status).toBe(404);
  });

  it("creates a reset link for an admin", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "u1", email: "jane@example.com", firstName: "Jane", lastName: "Doe" });
    mockCreateToken.mockResolvedValue({ token: "abc123", expiresAt: new Date(Date.now() + 3600000) });

    const res = await generateReset(
      new Request("http://localhost/api/admin/users/u1/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      params("u1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.url).toContain("/reset-password?token=abc123");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("emails the link when requested", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "u1", email: "jane@example.com", firstName: "Jane", lastName: "Doe" });
    mockCreateToken.mockResolvedValue({ token: "abc123", expiresAt: new Date(Date.now() + 3600000) });
    mockSendEmail.mockResolvedValue(true);

    const res = await generateReset(
      new Request("http://localhost/api/admin/users/u1/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: true }),
      }),
      params("u1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalled();
    expect(data.data.emailSent).toBe(true);
  });
});

describe("GET /api/auth/reset-password", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for an invalid token", async () => {
    mockValidate.mockResolvedValue({ error: "invalid" });
    const res = await validateReset(
      new Request("http://localhost/api/auth/reset-password?token=bad")
    );
    expect(res.status).toBe(400);
  });

  it("returns the user email for a valid token", async () => {
    mockValidate.mockResolvedValue({
      user: { id: "u1", email: "jane@example.com", firstName: "Jane", lastName: "Doe" },
    });
    const res = await validateReset(
      new Request("http://localhost/api/auth/reset-password?token=good")
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.email).toBe("jane@example.com");
  });
});

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a short password", async () => {
    const res = await submitReset(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "good", password: "123" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an expired token", async () => {
    mockReset.mockResolvedValue({ error: "expired" });
    const res = await submitReset(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "good", password: "newpassword123" }),
      })
    );
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("expired");
  });

  it("resets the password for a valid token", async () => {
    mockReset.mockResolvedValue({ success: true, user: { id: "u1", email: "jane@example.com" } });
    const res = await submitReset(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "good", password: "newpassword123" }),
      })
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
