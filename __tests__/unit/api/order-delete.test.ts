/**
 * Unit tests for the order DELETE endpoint.
 *
 * Tests:
 * - Unauthenticated requests are rejected (401)
 * - Non-admin (customer / staff) requests are rejected (403)
 * - Admin deletes an order and cleans up stored images
 * - Unknown order returns 404
 */

jest.mock("@/lib/db", () => ({
  db: {
    order: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/orders/status", () => ({
  changeOrderStatus: jest.fn(),
  deleteFromR2: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/telegram", () => ({
  notifyAdmins: jest.fn().mockResolvedValue(undefined),
  buildAdminCancellationMessage: jest.fn(),
}));

import { DELETE } from "@/app/api/orders/[id]/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { deleteFromR2 } from "@/lib/orders/status";

const mockFindFirst = db.order.findFirst as jest.Mock;
const mockDelete = db.order.delete as jest.Mock;
const mockAuth = auth as jest.Mock;
const mockDeleteFromR2 = deleteFromR2 as jest.Mock;

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function deleteRequest() {
  return new Request("http://localhost/api/orders/o1", { method: "DELETE" });
}

describe("DELETE /api/orders/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests with 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(deleteRequest(), params("o1"));
    expect(res.status).toBe(401);
  });

  it("rejects customer requests with 403", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CUSTOMER" } });
    const res = await DELETE(deleteRequest(), params("o1"));
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects staff requests with 403", async () => {
    mockAuth.mockResolvedValue({ user: { id: "s1", role: "STAFF" } });
    const res = await DELETE(deleteRequest(), params("o1"));
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown order", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    mockFindFirst.mockResolvedValue(null);
    const res = await DELETE(deleteRequest(), params("missing"));
    expect(res.status).toBe(404);
  });

  it("deletes the order and cleans up stored images for an admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    mockFindFirst.mockResolvedValue({
      id: "o1",
      receiptImage: "https://cdn/receipt.jpg",
      paymentProofs: [{ imageUrl: "https://cdn/proof.jpg" }, { imageUrl: null }],
    });
    mockDelete.mockResolvedValue({ id: "o1" });

    const res = await DELETE(deleteRequest(), params("o1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "o1" } });
    expect(mockDeleteFromR2).toHaveBeenCalledTimes(2);
    expect(mockDeleteFromR2).toHaveBeenCalledWith("https://cdn/receipt.jpg");
    expect(mockDeleteFromR2).toHaveBeenCalledWith("https://cdn/proof.jpg");
  });
});
