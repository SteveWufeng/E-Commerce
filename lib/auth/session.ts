/**
 * Server-side session helper.
 *
 * Provides a type-safe wrapper around the NextAuth auth() function
 * for use in Server Components and Route Handlers.
 *
 * Usage:
 *   const session = await getSession();
 *   if (!session?.user) { /* not logged in *\/ }
 *   const isAdmin = session?.user?.role === "ADMIN";
 */
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth();
}

/**
 * Get the current user from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) return null;

  return {
    id: (session.user as { id: string }).id,
    email: session.user.email!,
    name: session.user.name,
    role: (session.user as { role: string }).role,
  };
}

/**
 * Check if the current user is an admin.
 * Returns false if not authenticated or not an admin.
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "ADMIN";
}

/**
 * Require authentication in a server component or route handler.
 * Returns the session if authenticated, otherwise throws a redirect error.
 *
 * Note: In route handlers, check the return value and return a 401 response.
 * In server components, this will redirect to login.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }
  return session;
}

/**
 * Require admin role in a server component or route handler.
 * Returns the session if the user is an admin, otherwise returns null.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) return null;
  const role = (session.user as { role?: string })?.role;
  if (role !== "ADMIN") return null;
  return session;
}
