"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

const LAST_SEEN_KEY = "buhoya_admin_alerts_seen_at";
const POLL_INTERVAL = 20000;

/**
 * Polls the admin notification feed and surfaces new entries:
 * - shows an unread badge linking to the Alerts tab
 * - raises a browser notification when permission has been granted
 *
 * Mounted inside the admin shell so alerts arrive on any admin page.
 */
export function AdminNotificationBell({ className = "" }: { className?: string }) {
  const [unread, setUnread] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/admin/notifications?limit=15", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json.success) return;

        setUnread(json.unreadCount ?? 0);
        const items: Array<{ id: string; title?: string; body?: string; createdAt: string }> =
          json.data ?? [];

        const seenAt = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
        const fresh = items.filter((n) => new Date(n.createdAt).getTime() > seenAt);

        if (!initialized.current) {
          // Don't spam notifications for the backlog on first load.
          initialized.current = true;
        } else if (fresh.length > 0) {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            for (const n of fresh.slice(0, 3).reverse()) {
              try {
                new Notification(n.title || "Store alert", {
                  body: n.body || "",
                  tag: n.id,
                });
              } catch {
                /* notification failed — ignore */
              }
            }
          }
        }

        if (fresh.length > 0) {
          localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
        }
      } catch {
        /* network error — try again next tick */
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/admin/messages?tab=alerts"
      className={`relative inline-flex items-center justify-center ${className}`}
      title="Alerts"
      aria-label="Alerts"
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
