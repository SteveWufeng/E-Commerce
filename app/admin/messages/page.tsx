"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, Search, ArrowLeft } from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { formatDateTime } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

interface Conversation {
  userId: string;
  name: string;
  email: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface Message {
  id: string;
  sender: "CUSTOMER" | "ADMIN";
  body: string;
  createdAt: string;
}

interface ThreadUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  telegramReachable: boolean;
}

interface AdminNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telegramReachable: boolean;
}

type Tab = "conversations" | "alerts";

const KIND_LABEL: Record<string, string> = {
  NEW_ORDER: "🆕",
  ORDER_CANCELLED: "❌",
  PAYMENT_UPDATE: "💳",
  CUSTOMER_MESSAGE: "💬",
  SYSTEM: "ℹ️",
};

export default function AdminMessagesPage() {
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("conversations");

  // ---- Conversations ----
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [threadUser, setThreadUser] = useState<ThreadUser | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ---- Notifications (alerts) ----
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  // ---- New message picker ----
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messages");
      const data = await res.json();
      setConversations(data.data || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await fetch("/api/admin/notifications?limit=200");
      const data = await res.json();
      setNotifications(data.data || []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Initial tab from the URL (?tab=alerts) without requiring a Suspense boundary.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "alerts") setTab("alerts");
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (tab === "alerts") loadNotifications();
  }, [tab, loadNotifications]);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const loadRecipients = useCallback(async (query: string) => {
    setRecipientsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/messages/recipients${query ? `?search=${encodeURIComponent(query)}` : ""}`
      );
      const data = await res.json();
      setRecipients(data.data || []);
    } catch (error) {
      console.error("Failed to load recipients:", error);
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!newMessageOpen) return;
    const handle = setTimeout(() => loadRecipients(recipientSearch.trim()), 250);
    return () => clearTimeout(handle);
  }, [newMessageOpen, recipientSearch, loadRecipients]);

  async function openThread(userId: string) {
    setActiveUserId(userId);
    setIsLoadingThread(true);
    setThread([]);
    try {
      const res = await fetch(`/api/admin/messages/${userId}`);
      const data = await res.json();
      setThread(data.data?.messages || []);
      setThreadUser(data.data?.user || null);
      setConversations((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, unread: 0 } : c))
      );
    } catch (error) {
      console.error("Failed to load thread:", error);
    } finally {
      setIsLoadingThread(false);
    }
  }

  function pickRecipient(recipient: Recipient) {
    setNewMessageOpen(false);
    setRecipientSearch("");
    setTab("conversations");
    openThread(recipient.id);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeUserId || !reply.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/admin/messages/${activeUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setReply("");
      await openThread(activeUserId);
      loadConversations();
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setIsSending(false);
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications read:", error);
    }
  }

  async function openNotification(notification: AdminNotification) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [notification.id] }),
    }).catch(() => {});
    if (notification.link) window.open(notification.link, "_blank");
  }

  async function enableBrowserAlerts() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  const unreadAlerts = notifications.filter((n) => !n.read).length;

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("messages")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("supportInbox")}</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setTab("conversations")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "conversations" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            {t("conversations")}
          </button>
          <button
            onClick={() => setTab("alerts")}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "alerts" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            <Bell className="w-4 h-4" />
            {t("alerts")}
            {unreadAlerts > 0 && <span className="badge-danger text-xs">{unreadAlerts}</span>}
          </button>
        </div>
      </div>

      {tab === "conversations" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-240px)]">
          {/* Conversation list */}
          <div className={`card p-0 overflow-hidden flex-col ${activeUserId ? "hidden lg:flex" : "flex"}`}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">{t("conversations")}</span>
              <button
                onClick={() => setNewMessageOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("newMessage")}
              </button>
            </div>
            {isLoading ? (
              <p className="p-4 text-sm text-gray-500">{t("loading")}</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">{t("noMessages")}</p>
            ) : (
              <ul className="divide-y divide-gray-100 overflow-y-auto">
                {conversations.map((c) => (
                  <li key={c.userId}>
                    <button
                      onClick={() => openThread(c.userId)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        activeUserId === c.userId ? "bg-primary-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 truncate">{c.name}</span>
                        {c.unread > 0 && (
                          <span className="badge-danger text-xs shrink-0">{c.unread}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                      <p className="text-sm text-gray-500 truncate mt-1">{c.lastMessage}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Thread */}
          <div className={`card p-0 lg:col-span-2 overflow-hidden flex-col ${activeUserId ? "flex" : "hidden lg:flex"}`}>
            {!activeUserId ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4">
                {t("selectConversation")}
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveUserId(null)}
                      className="lg:hidden -ml-1 p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                      aria-label={t("back")}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <p className="font-medium text-gray-900">
                      {threadUser
                        ? [threadUser.firstName, threadUser.lastName].filter(Boolean).join(" ") ||
                          threadUser.email
                        : ""}
                    </p>
                  </div>
                  {threadUser && !threadUser.telegramReachable && (
                    <p className="text-xs text-amber-600">{t("customerNotReachable")}</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isLoadingThread ? (
                    <p className="text-sm text-gray-500">{t("loading")}</p>
                  ) : thread.length === 0 ? (
                    <p className="text-sm text-gray-400">{t("noMessages")}</p>
                  ) : (
                    thread.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.sender === "ADMIN" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            m.sender === "ADMIN"
                              ? "bg-primary-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              m.sender === "ADMIN" ? "text-primary-100" : "text-gray-400"
                            }`}
                          >
                            {formatDateTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={sendReply} className="border-t border-gray-100 p-3 flex gap-2">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t("typeAMessage")}
                    className="input flex-1"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !reply.trim()}
                    className="btn-primary px-4 disabled:opacity-50"
                  >
                    {isSending ? t("processing") : t("send")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Alerts tab */
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">{t("alerts")}</span>
              {unreadAlerts > 0 && <span className="badge-danger text-xs">{unreadAlerts}</span>}
            </div>
            <div className="flex items-center gap-3">
              {permission === "granted" ? (
                <span className="text-xs text-green-600">{t("browserAlertsOn")}</span>
              ) : permission === "unsupported" || permission === "denied" ? (
                <span className="text-xs text-gray-400">{t("browserAlertsBlocked")}</span>
              ) : (
                <button
                  onClick={enableBrowserAlerts}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {t("enableBrowserAlerts")}
                </button>
              )}
              {unreadAlerts > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-gray-600 hover:underline"
                >
                  {t("markAllRead")}
                </button>
              )}
            </div>
          </div>

          {notificationsLoading ? (
            <p className="p-4 text-sm text-gray-500">{t("loading")}</p>
          ) : notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">{t("noAlerts")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotification(n)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 ${
                      n.read ? "" : "bg-primary-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">
                        <span className="mr-1.5">{KIND_LABEL[n.kind] || "ℹ️"}</span>
                        {n.title}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{n.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* New message picker */}
      {newMessageOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">{t("newMessage")}</h2>
              <button
                onClick={() => setNewMessageOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{t("selectRecipient")}</p>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder={t("searchRecipients")}
                className="input w-full pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {recipientsLoading ? (
                <p className="p-4 text-sm text-gray-500">{t("loading")}</p>
              ) : recipients.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">{t("noRecipients")}</p>
              ) : (
                recipients.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => pickRecipient(r)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {[r.firstName, r.lastName].filter(Boolean).join(" ") || r.email}
                    </p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
