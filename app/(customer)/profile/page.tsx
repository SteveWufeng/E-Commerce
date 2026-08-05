"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LogOut, User, Mail, Phone, Shield, Send } from "lucide-react";

/**
 * User profile page — view and manage account settings.
 *
 * Features:
 * - Display user information (name, email, phone, role)
 * - Telegram notifications linking
 * - Sign out button
 * - Link to order history
 * - Admin link if user has ADMIN role
 */
export default function ProfilePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    telegramChatId: string | null;
    telegramOptIn: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login?callbackUrl=/profile");
            return;
          }
          throw new Error("Failed to load profile");
        }
        const data = await res.json();
        setUser(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  async function handleSignOut() {
    startTransition(async () => {
      await signOut({ callbackUrl: "/" });
    });
  }

  async function handleLinkTelegram() {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      const res = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramLink(data.data.deepLink);
      } else {
        setTelegramError(data.error || "Failed to create link");
      }
    } catch {
      setTelegramError("Failed to create link");
    } finally {
      setTelegramBusy(false);
    }
  }

  async function handleUnlinkTelegram() {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink" }),
      });
      setUser((u) => (u ? { ...u, telegramChatId: null, telegramOptIn: false } : u));
      setTelegramLink(null);
    } catch {
      setTelegramError("Failed to unlink");
    } finally {
      setTelegramBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-32 bg-gray-200 rounded-xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full text-center">
          <p className="text-gray-500">Failed to load profile.</p>
          <Link href="/login" className="text-primary-600 font-medium hover:underline mt-2 inline-block">
            Sign in
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-12 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        <div className="card space-y-6">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.role === "ADMIN"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {user.role === "ADMIN" ? (
                  <Shield className="w-3 h-3 mr-1" />
                ) : null}
                {user.role}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{user.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-100 pt-6 space-y-3">
            <Link
              href="/orders"
              className="btn-secondary w-full"
            >
              View Order History
            </Link>

            {user.role === "ADMIN" && (
              <Link
                href="/admin/dashboard"
                className="btn-primary w-full"
              >
                Go to Admin Panel
              </Link>
            )}

            <button
              onClick={handleSignOut}
              disabled={isPending}
              className="btn-danger w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isPending ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>

        {/* Telegram Notifications */}
        <div className="card mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Telegram Notifications</h2>
              <p className="text-sm text-gray-500">Get real-time updates on your order status.</p>
            </div>
          </div>

          {user.telegramChatId ? (
            <>
              <p className="text-sm text-gray-700">
                ✅ Telegram is linked{user.telegramOptIn ? "" : " (notifications off)"}.
              </p>
              <button
                onClick={handleUnlinkTelegram}
                disabled={telegramBusy}
                className="btn-danger w-full"
              >
                {telegramBusy ? "Working..." : "Unlink Telegram"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Link your Telegram account to receive order confirmations, pickup
                reminders, and cancellation notices.
              </p>

              {telegramLink ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    Tap the button below to open Telegram and connect your account.
                    This link expires in 24 hours and can only be used once.
                  </p>
                  <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Open in Telegram
                  </a>
                  <p className="text-xs text-gray-500 break-all bg-gray-50 rounded-lg p-2">
                    {telegramLink}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleLinkTelegram}
                  disabled={telegramBusy}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {telegramBusy ? "Generating link..." : "Link Telegram Account"}
                </button>
              )}

              {telegramError && (
                <p className="text-sm text-red-600">{telegramError}</p>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
