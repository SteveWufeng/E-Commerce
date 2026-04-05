/**
 * NextAuth.js v5 route handler.
 *
 * This is the catch-all API route that NextAuth uses for
 * all authentication operations (sign-in, sign-out, session, etc.).
 *
 * Mounted at: /api/auth/[...nextauth]
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
