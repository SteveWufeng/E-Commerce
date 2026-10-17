"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useLocale } from "@/hooks/use-locale";

type Status = "loading" | "valid" | "invalid" | "success";

export default function ResetPasswordPage() {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const value = sp.get("token") || "";
    setToken(value);

    if (!value) {
      setStatus("invalid");
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(value)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEmail(data.data.email);
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || t("resetPasswordInvalid"));
          return;
        }
        setStatus("success");
      } catch {
        setError(t("resetPasswordInvalid"));
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{t("resetPasswordHeading")}</h1>
            <p className="text-gray-500 mt-2">
              {status === "success" ? t("resetPasswordSuccessMessage") : t("resetPasswordSubtitle")}
            </p>
          </div>

          {status === "loading" && (
            <div className="card text-center text-gray-500 py-8">
              {t("verifyingResetLink")}
            </div>
          )}

          {status === "invalid" && (
            <div className="card text-center">
              <div
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                role="alert"
              >
                {t("resetPasswordInvalid")}
              </div>
              <Link href="/login" className="text-primary-600 font-medium hover:underline">
                {t("goToLogin")}
              </Link>
            </div>
          )}

          {status === "success" && (
            <div className="card text-center">
              <div
                className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm"
                role="alert"
              >
                {t("resetPasswordSuccess")}
              </div>
              <Link href="/login" className="btn-primary inline-block px-6 py-3">
                {t("goToLogin")}
              </Link>
            </div>
          )}

          {status === "valid" && (
            <>
              {email && (
                <p className="text-center text-sm text-gray-500 mb-4">{email}</p>
              )}
              {error && (
                <div
                  className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                  role="alert"
                >
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="card space-y-4">
                <div>
                  <label htmlFor="password" className="label">
                    {t("newPasswordLabel")}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="label">
                    {t("confirmNewPasswordLabel")}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={isPending} className="btn-primary w-full py-3">
                  {isPending ? t("resettingPassword") : t("resetPasswordButton")}
                </button>
              </form>
            </>
          )}

          {status !== "success" && (
            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-gray-500 hover:text-primary-600">
                {t("continueAsGuest")}
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
