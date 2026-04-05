"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

/**
 * Login page — customer and admin authentication.
 *
 * Features:
 * - Email + password form using NextAuth signIn
 * - Redirect to callback URL or home after login
 * - Link to signup for new users
 * - Guest checkout option (no login required)
 * - Error messages from URL params (e.g., after middleware redirect)
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Handle error from middleware redirect
  const urlError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const errorMessageMap: Record<string, string> = {
    auth_required: "Please sign in to access that page.",
    unauthorized: "You do not have permission to access that page.",
    CredentialsSignin: "Invalid email or password.",
  };

  const displayError = error || (urlError ? errorMessageMap[urlError] || "An error occurred" : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
            <p className="text-gray-500 mt-2">
              Welcome back! Sign in to your account.
            </p>
          </div>

          {displayError && (
            <div
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
              role="alert"
            >
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-3"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary-600 font-medium hover:underline">
                Sign up
              </Link>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Or{" "}
              <Link href="/" className="text-primary-600 font-medium hover:underline">
                continue as guest
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
