import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = z.object({
          email: z.string().email("Invalid email address"),
          password: z.string().min(6, "Password must be at least 6 characters"),
        }).safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!user.passwordHash) return null;

        if (!user.isVerified) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email! },
          });

          if (existingUser) {
            if (!existingUser.isVerified) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { isVerified: true },
              });
            }
            return true;
          }

          await db.user.create({
            data: {
              email: user.email!,
              firstName: user.name?.split(" ")[0] || "Google",
              lastName: user.name?.split(" ").slice(1).join(" ") || "User",
              role: "CUSTOMER",
              isVerified: true,
            },
          });

          return true;
        } catch (error) {
          console.error("[Google SignIn] Database error:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = ((user as unknown) as { role?: string }).role as string | undefined;
        if (account?.provider === "google") {
          const dbUser = await db.user.findUnique({ where: { email: token.email! } });
          token.id = dbUser?.id || user.id;
        } else {
          token.id = user.id as string;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        ((session.user as unknown) as { role?: string }).role = token.role as string;
        ((session.user as unknown) as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  // trustHost needed for containerized envs (Railway, Docker) where the
  // request host may not match NEXTAUTH_URL. For Google OAuth, the redirect
  // URI is determined by NEXTAUTH_URL — set it in Railway dashboard.
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
});
