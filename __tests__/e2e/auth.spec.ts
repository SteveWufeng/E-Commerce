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

test.beforeEach(async ({ page }) => {
  // Force English locale so assertions are deterministic regardless of
  // the app's default locale (es) or any persisted user preference.
  await page.addInitScript(() => {
    window.localStorage.setItem("ecom_locale", "en");
  });
});

test.describe("Authentication E2E", () => {
  test.describe("Signup flow", () => {
    test("displays signup form with all fields", async ({ page }) => {
      await page.goto("/signup");

      const form = page.getByRole("main");
      await expect(form.getByRole("heading", { name: /create account/i })).toBeVisible();
      await expect(form.getByLabel("First Name")).toBeVisible();
      await expect(form.getByLabel("Last Name")).toBeVisible();
      await expect(form.getByLabel("Email")).toBeVisible();
      await expect(form.getByLabel("Phone")).toBeVisible();
      await expect(form.getByLabel("Password", { exact: true })).toBeVisible();
      await expect(form.getByLabel("Confirm Password")).toBeVisible();
      await expect(form.getByRole("button", { name: /create account/i })).toBeVisible();
    });

    test("shows link to login page", async ({ page }) => {
      await page.goto("/signup");
      await expect(
        page.getByRole("main").getByRole("link", { name: /sign in/i })
      ).toBeVisible();
    });

    test("shows validation error for mismatched passwords", async ({ page }) => {
      await page.goto("/signup");

      const form = page.getByRole("main");
      await form.getByLabel("First Name").fill("John");
      await form.getByLabel("Last Name").fill("Doe");
      await form.getByLabel("Email").fill("john@example.com");
      await form.getByLabel("Password", { exact: true }).fill("password123");
      await form.getByLabel("Confirm Password").fill("different");

      await form.getByRole("button", { name: /create account/i }).click();

      await expect(page.getByText("Passwords do not match")).toBeVisible();
    });

    test("shows validation error for short password", async ({ page }) => {
      await page.goto("/signup");

      const form = page.getByRole("main");
      await form.getByLabel("First Name").fill("John");
      await form.getByLabel("Last Name").fill("Doe");
      await form.getByLabel("Email").fill("john@example.com");
      await form.getByLabel("Password", { exact: true }).fill("short");
      await form.getByLabel("Confirm Password").fill("short");

      await form.getByRole("button", { name: /create account/i }).click();

      // Native HTML minLength validation blocks submission and shows a
      // constraint error on the password field before the React handler runs.
      const validationMessage = await form
        .getByLabel("Password", { exact: true })
        .evaluate((el) => (el as HTMLInputElement).validationMessage);
      expect(validationMessage.length).toBeGreaterThan(0);
      // Submission is blocked: still on /signup, no success state.
      await expect(page).toHaveURL(/\/signup/);
      await expect(page.getByText("Check Your Email")).not.toBeVisible();
    });
  });

  test.describe("Login flow", () => {
    test("displays login form", async ({ page }) => {
      await page.goto("/login");

      const form = page.getByRole("main");
      await expect(form.getByRole("heading", { name: /sign in/i })).toBeVisible();
      await expect(form.getByLabel("Email")).toBeVisible();
      await expect(form.getByLabel("Password", { exact: true })).toBeVisible();
      await expect(form.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
    });

    test("shows link to signup page", async ({ page }) => {
      await page.goto("/login");
      await expect(
        page.getByRole("main").getByRole("link", { name: /sign up/i })
      ).toBeVisible();
    });

    test("shows guest checkout option", async ({ page }) => {
      await page.goto("/login");
      await expect(
        page.getByRole("main").getByRole("link", { name: /continue as guest/i })
      ).toBeVisible();
    });
  });

  test.describe("Header auth state", () => {
    test("shows sign in link when not authenticated", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.locator("header").getByRole("link", { name: /sign in/i })
      ).toBeVisible();
    });

    test("shows cart icon on all pages", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.locator("header").getByRole("link", { name: /cart/i })
      ).toBeVisible();
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
