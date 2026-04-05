/**
 * Next.js middleware for authentication and authorization.
 *
 * Protects routes based on user session state:
 * - /admin/* requires ADMIN role — redirects to /login with error
 * - /profile requires authenticated session — redirects to /login
 * - /login and /signup redirect to / if already authenticated
 *
 * Public routes (no redirect):
 * - / (home), /product/*, /cart, /checkout, /search
 * - /api/* (API routes handle their own auth checks)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Routes that require authentication
const PROTECTED_ROUTES = ["/profile", "/profile/"];

// Routes that require admin role
const ADMIN_ROUTES = ["/admin", "/admin/"];

// Auth pages (redirect away if already logged in)
const AUTH_PAGES = ["/login", "/signup"];

export default auth((req) => {
  const url = req.nextUrl.clone();
  const session = req.auth;
  const pathname = url.pathname;

  // --- Admin routes: require ADMIN role ---
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!session) {
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      url.searchParams.set("error", "auth_required");
      return NextResponse.redirect(url);
    }
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      url.pathname = "/";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- Protected routes: require any authenticated session ---
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!session) {
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- Auth pages: redirect to home if already logged in ---
  if (AUTH_PAGES.includes(pathname)) {
    if (session) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- All other routes: allow through ---
  return NextResponse.next();
});

// Only run middleware on relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
  ],
};
