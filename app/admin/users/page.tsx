"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { KeyRound } from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { formatDateTime } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

type UserRole = "CUSTOMER" | "STAFF" | "ADMIN";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isVerified: boolean;
  telegramChatId: string | null;
  telegramOptIn: boolean;
  createdAt: string;
  _count?: { orders: number };
}

const ROLE_LABEL_KEYS: Record<UserRole, "roleCustomer" | "roleStaff" | "roleAdmin"> = {
  CUSTOMER: "roleCustomer",
  STAFF: "roleStaff",
  ADMIN: "roleAdmin",
};

const ROLE_BADGE: Record<UserRole, string> = {
  CUSTOMER: "badge-info",
  STAFF: "badge-warning",
  ADMIN: "badge-success",
};

export default function AdminUsersPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [telegramUser, setTelegramUser] = useState<UserRow | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");

  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetLink, setResetLink] = useState("");
  const [resetExpiresAt, setResetExpiresAt] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);

  const loadUsers = useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `/api/admin/users${query ? `?search=${encodeURIComponent(query)}` : ""}`
      );
      const data = await res.json();
      setUsers(data.data || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => loadUsers(search.trim()), 250);
    return () => clearTimeout(handle);
  }, [search, loadUsers]);

  async function patchUser(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || t("updateFailed"));
        return null;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.data } : u)));
      return data.data as UserRow;
    } catch (error) {
      console.error("Failed to update user:", error);
      alert(t("updateFailed"));
      return null;
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditName(`${user.firstName} ${user.lastName}`.trim());
    setEditPhone(user.phone || "");
  }

  async function handleEditSave() {
    if (!editUser) return;
    const parts = editName.trim().split(/\s+/);
    const firstName = parts.shift() || editUser.firstName;
    const lastName = parts.join(" ") || editUser.lastName;
    const updated = await patchUser(editUser.id, {
      firstName,
      lastName,
      phone: editPhone.trim() || null,
    });
    if (updated) setEditUser(null);
  }

  function openTelegram(user: UserRow) {
    setTelegramUser(user);
    setTelegramChatId(user.telegramChatId || "");
  }

  async function handleTelegramSave() {
    if (!telegramUser) return;
    const updated = await patchUser(telegramUser.id, {
      telegramChatId: telegramChatId.trim() || null,
    });
    if (updated) setTelegramUser(null);
  }

  async function handleUnbind(user: UserRow) {
    await patchUser(user.id, { telegramChatId: null });
  }

  function openReset(user: UserRow) {
    setResetUser(user);
    setResetLink("");
    setResetExpiresAt("");
    setResetEmailSent(false);
    setResetCopied(false);
  }

  async function generateResetLink(sendEmail: boolean) {
    if (!resetUser) return;
    setResetBusy(true);
    setResetCopied(false);
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || t("updateFailed"));
        return;
      }
      setResetLink(data.data.url);
      setResetExpiresAt(data.data.expiresAt);
      setResetEmailSent(Boolean(data.data.emailSent));
    } catch (error) {
      console.error("Failed to create reset link:", error);
      alert(t("updateFailed"));
    } finally {
      setResetBusy(false);
    }
  }

  async function copyResetLink() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      setResetCopied(true);
    } catch {
      // Clipboard may be unavailable; the link is still selectable in the input.
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("users")}</h1>
      <p className="text-sm text-gray-500 mb-6">{t("manageUsers")}</p>

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchUsersPlaceholder")}
          className="input max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-gray-200 h-16" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("nameLabel")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("customerEmail")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("role")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("verified")}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t("telegram")}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="text-gray-900 font-medium">
                          {user.firstName} {user.lastName}
                          {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                        </div>
                        <div className="text-gray-500 text-xs">{formatDateTime(user.createdAt)}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{user.email}</td>
                      <td className="py-3 px-4">
                        <select
                          value={user.role}
                          disabled={isSelf || busyId === user.id}
                          onChange={(e) => patchUser(user.id, { role: e.target.value })}
                          className="input py-1 text-xs max-w-[9rem]"
                        >
                          {(["CUSTOMER", "STAFF", "ADMIN"] as UserRole[]).map((role) => (
                            <option key={role} value={role}>
                              {t(ROLE_LABEL_KEYS[role])}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => patchUser(user.id, { isVerified: !user.isVerified })}
                          disabled={busyId === user.id}
                          className={`badge ${user.isVerified ? "badge-success" : "badge-warning"} cursor-pointer`}
                          title={user.isVerified ? t("verified") : t("unverified")}
                        >
                          {user.isVerified ? t("verified") : t("unverified")}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {user.telegramChatId ? (
                          <span className="text-xs text-gray-700 font-mono">{user.telegramChatId}</span>
                        ) : (
                          <span className="text-xs text-gray-400">{t("telegramNotBound")}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(user)}
                          className="text-xs py-1.5 px-3 text-primary-600 hover:underline"
                        >
                          {t("editUser")}
                        </button>
                        <button
                          onClick={() => openReset(user)}
                          className="ml-1 inline-flex items-center gap-1 text-xs py-1.5 px-3 text-gray-600 hover:text-gray-800"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          {t("resetPassword")}
                        </button>
                        {user.telegramChatId ? (
                          <button
                            onClick={() => handleUnbind(user)}
                            disabled={busyId === user.id}
                            className="ml-2 text-xs py-1.5 px-3 text-red-600 hover:text-red-700"
                          >
                            {t("unbindTelegram")}
                          </button>
                        ) : (
                          <button
                            onClick={() => openTelegram(user)}
                            className="ml-2 text-xs py-1.5 px-3 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                          >
                            {t("bindTelegram")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">{t("noUsers")}</div>
          )}
        </div>
      )}

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">{t("editUser")}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("nameLabel")}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("phone")}</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setEditUser(null)}
                className="btn-secondary text-sm py-2 px-4"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleEditSave}
                disabled={busyId === editUser.id}
                className="btn-primary text-sm py-2 px-4"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram bind modal */}
      {telegramUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-1">{t("bindTelegram")}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {telegramUser.firstName} {telegramUser.lastName} · {telegramUser.email}
            </p>
            <label className="block text-sm text-gray-500 mb-1">{t("telegramChatIdLabel")}</label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="123456789"
              className="input w-full"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setTelegramUser(null)}
                className="btn-secondary text-sm py-2 px-4"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleTelegramSave}
                disabled={busyId === telegramUser.id}
                className="btn-primary text-sm py-2 px-4"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password reset modal */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold mb-1">{t("resetPasswordTitle")}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {resetUser.firstName} {resetUser.lastName} · {resetUser.email}
            </p>

            {!resetLink ? (
              <>
                <p className="text-sm text-gray-500 mb-4">{t("resetPasswordHint")}</p>
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    onClick={() => setResetUser(null)}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={() => generateResetLink(false)}
                    disabled={resetBusy}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    {resetBusy ? t("saving") : t("generateResetLink")}
                  </button>
                  <button
                    onClick={() => generateResetLink(true)}
                    disabled={resetBusy}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    {resetBusy ? t("saving") : t("generateAndEmail")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="block text-sm text-gray-500 mb-1">{t("resetLinkLabel")}</label>
                <input
                  type="text"
                  readOnly
                  value={resetLink}
                  onFocus={(e) => e.target.select()}
                  className="input w-full font-mono text-xs"
                />
                {resetExpiresAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    {t("resetLinkExpires")}: {formatDateTime(resetExpiresAt)}
                  </p>
                )}
                {resetEmailSent && (
                  <p className="text-xs text-green-600 mt-2">{t("resetEmailSent")}</p>
                )}
                <div className="flex flex-wrap justify-end gap-3 mt-5">
                  <button
                    onClick={() => setResetUser(null)}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    {t("close")}
                  </button>
                  <button
                    onClick={copyResetLink}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    {resetCopied ? t("copied") : t("copyLink")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
