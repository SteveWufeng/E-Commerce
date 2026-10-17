"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function AdminMessagesPage() {
  const { t } = useLocale();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [threadUser, setThreadUser] = useState<ThreadUser | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

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

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function openThread(userId: string) {
    setActiveUserId(userId);
    setIsLoadingThread(true);
    setThread([]);
    try {
      const res = await fetch(`/api/admin/messages/${userId}`);
      const data = await res.json();
      setThread(data.data?.messages || []);
      setThreadUser(data.data?.user || null);
      // Reflect read state in the list.
      setConversations((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, unread: 0 } : c))
      );
    } catch (error) {
      console.error("Failed to load thread:", error);
    } finally {
      setIsLoadingThread(false);
    }
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

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("messages")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("supportInbox")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Conversation list */}
        <div className="card p-0 overflow-hidden flex flex-col">
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
        <div className="card p-0 lg:col-span-2 overflow-hidden flex flex-col">
          {!activeUserId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4">
              {t("selectConversation")}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-medium text-gray-900">
                  {threadUser
                    ? [threadUser.firstName, threadUser.lastName].filter(Boolean).join(" ") ||
                      threadUser.email
                    : ""}
                </p>
                {threadUser && !threadUser.telegramReachable && (
                  <p className="text-xs text-amber-600">{t("customerNotReachable")}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingThread ? (
                  <p className="text-sm text-gray-500">{t("loading")}</p>
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
    </AdminLayout>
  );
}
