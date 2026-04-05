/**
 * E2E Playwright tests for the authentication system.
 *
 * Tests real browser interactions:
 * - User signup flow
 * - User login flow
 * - Admin route protection
 * - Guest checkout flow
 * - Profile page access
 * - Logout flow
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication E2E", () => {
  test.describe("Signup flow", () => {
    test("displays signup form with all fields", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
      await expect(page.getByLabel("First Name")).toBeVisible();
      await expect(page.getByLabel("Last Name")).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Phone")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByLabel("Confirm Password")).toBeVisible();
      await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    });

    test("shows link to login page", async ({ page }) => {
      await page.goto("/signup");
      await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    });

    test("shows validation error for mismatched passwords", async ({ page }) => {
      await page.goto("/signup");

      await page.getByLabel("First Name").fill("John");
      await page.getByLabel("Last Name").fill("Doe");
      await page.getByLabel("Email").fill("john@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.getByLabel("Confirm Password").fill("different");

      await page.getByRole("button", { name: /create account/i }).click();

      await expect(page.getByText("Passwords do not match")).toBeVisible();
    });

    test("shows validation error for short password", async ({ page }) => {
      await page.goto("/signup");

      await page.getByLabel("First Name").fill("John");
      await page.getByLabel("Last Name").fill("Doe");
      await page.getByLabel("Email").fill("john@example.com");
      await page.getByLabel("Password").fill("short");
      await page.getByLabel("Confirm Password").fill("short");

      await page.getByRole("button", { name: /create account/i }).click();

      await expect(page.getByText("Password must be at least 6 characters")).toBeVisible();
    });
  });

  test.describe("Login flow", () => {
    test("displays login form", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    });

    test("shows link to signup page", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
    });

    test("shows guest checkout option", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("link", { name: /continue as guest/i })).toBeVisible();
    });
  });

  test.describe("Header auth state", () => {
    test("shows sign in link when not authenticated", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: /sign in/i, exact: false })).toBeVisible();
    });

    test("shows cart icon on all pages", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: /cart/i })).toBeVisible();
    });
  });

  test.describe("Admin route protection", () => {
    test("redirects unauthenticated user from admin dashboard to login", async ({ page }) => {
      await page.goto("/admin/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test("redirects unauthenticated user from admin products to login", async ({ page }) => {
      await page.goto("/admin/products");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Profile route protection", () => {
    test("redirects unauthenticated user from profile to login", async ({ page }) => {
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Guest checkout", () => {
    test("allows access to cart without login", async ({ page }) => {
      await page.goto("/cart");
      // Cart page should be accessible
      await expect(page).toHaveURL(/\/cart/);
    });

    test("allows access to checkout without login", async ({ page }) => {
      await page.goto("/checkout");
      // Checkout page should be accessible (might redirect if cart empty, but not to login)
      const url = page.url();
      expect(url).not.toMatch(/\/login/);
    });
  });
});
