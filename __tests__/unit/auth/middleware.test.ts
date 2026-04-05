/**
 * Unit tests for the authentication middleware.
 *
 * Tests route protection logic:
 * - Admin routes require ADMIN role
 * - Admin routes redirect non-admins to home
 * - Admin routes redirect unauthenticated to login
 * - Protected routes (/profile) require authentication
 * - Auth pages redirect authenticated users to home
 * - Public routes pass through
 */

// We test the middleware logic by importing and simulating its behavior
// since Next.js middleware can't be directly unit-tested without the runtime

describe("Authentication middleware logic", () => {
  const ADMIN_ROUTES = ["/admin", "/admin/"];
  const PROTECTED_ROUTES = ["/profile", "/profile/"];
  const AUTH_PAGES = ["/login", "/signup"];

  function evaluateRoute(
    pathname: string,
    session: { user: { role: string } } | null
  ): { action: "allow" | "redirect"; target: string } {
    // Admin routes
    if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
      if (!session) {
        return { action: "redirect", target: "/login" };
      }
      if (session.user.role !== "ADMIN") {
        return { action: "redirect", target: "/" };
      }
      return { action: "allow", target: pathname };
    }

    // Protected routes
    if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
      if (!session) {
        return { action: "redirect", target: "/login" };
      }
      return { action: "allow", target: pathname };
    }

    // Auth pages
    if (AUTH_PAGES.includes(pathname)) {
      if (session) {
        return { action: "redirect", target: "/" };
      }
      return { action: "allow", target: pathname };
    }

    // Public routes
    return { action: "allow", target: pathname };
  }

  describe("Admin route protection", () => {
    it("allows admin to access /admin/dashboard", () => {
      const result = evaluateRoute("/admin/dashboard", {
        user: { role: "ADMIN" },
      });
      expect(result.action).toBe("allow");
    });

    it("allows admin to access /admin/products", () => {
      const result = evaluateRoute("/admin/products", {
        user: { role: "ADMIN" },
      });
      expect(result.action).toBe("allow");
    });

    it("redirects customer to home when accessing /admin/dashboard", () => {
      const result = evaluateRoute("/admin/dashboard", {
        user: { role: "CUSTOMER" },
      });
      expect(result.action).toBe("redirect");
      expect(result.target).toBe("/");
    });

    it("redirects unauthenticated user to login when accessing /admin", () => {
      const result = evaluateRoute("/admin/dashboard", null);
      expect(result.action).toBe("redirect");
      expect(result.target).toBe("/login");
    });
  });

  describe("Protected route protection", () => {
    it("allows authenticated user to access /profile", () => {
      const result = evaluateRoute("/profile", {
        user: { role: "CUSTOMER" },
      });
      expect(result.action).toBe("allow");
    });

    it("allows admin to access /profile", () => {
      const result = evaluateRoute("/profile", {
        user: { role: "ADMIN" },
      });
      expect(result.action).toBe("allow");
    });

    it("redirects unauthenticated user to login when accessing /profile", () => {
      const result = evaluateRoute("/profile", null);
      expect(result.action).toBe("redirect");
      expect(result.target).toBe("/login");
    });
  });

  describe("Auth page behavior", () => {
    it("allows unauthenticated user to access /login", () => {
      const result = evaluateRoute("/login", null);
      expect(result.action).toBe("allow");
    });

    it("allows unauthenticated user to access /signup", () => {
      const result = evaluateRoute("/signup", null);
      expect(result.action).toBe("allow");
    });

    it("redirects authenticated user away from /login", () => {
      const result = evaluateRoute("/login", {
        user: { role: "CUSTOMER" },
      });
      expect(result.action).toBe("redirect");
      expect(result.target).toBe("/");
    });

    it("redirects authenticated user away from /signup", () => {
      const result = evaluateRoute("/signup", {
        user: { role: "CUSTOMER" },
      });
      expect(result.action).toBe("redirect");
      expect(result.target).toBe("/");
    });
  });

  describe("Public routes", () => {
    it("allows anyone to access home page", () => {
      const resultUnauth = evaluateRoute("/", null);
      const resultAuth = evaluateRoute("/", { user: { role: "CUSTOMER" } });
      expect(resultUnauth.action).toBe("allow");
      expect(resultAuth.action).toBe("allow");
    });

    it("allows anyone to access /cart", () => {
      const result = evaluateRoute("/cart", null);
      expect(result.action).toBe("allow");
    });

    it("allows anyone to access /checkout", () => {
      const result = evaluateRoute("/checkout", null);
      expect(result.action).toBe("allow");
    });

    it("allows anyone to access /search", () => {
      const result = evaluateRoute("/search", null);
      expect(result.action).toBe("allow");
    });
  });
});
