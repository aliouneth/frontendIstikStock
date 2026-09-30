"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  type AdminUserPayload,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import type { AdminUser, Subscription } from "@/lib/types";

interface Draft {
  id: number | null;
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  subscription_id: number | null;
  subscription_expires_at: string;
  is_active: boolean;
}

const EMPTY: Draft = {
  id: null,
  name: "",
  email: "",
  password: "",
  role: "user",
  subscription_id: null,
  subscription_expires_at: "",
  is_active: true,
};

function toDraft(user: AdminUser): Draft {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    subscription_id: user.subscription_id,
    subscription_expires_at: user.subscription_expires_at
      ? user.subscription_expires_at.slice(0, 10)
      : "",
    is_active: user.is_active,
  };
}

export default function UsersPanel() {
  const { user: me, plans, refresh } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [resetValue, setResetValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminUsers({ search, page });
      setUsers(res.data);
      setLastPage(res.meta.last_page);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function planName(id: number | null): string {
    const plan = plans.find((p: Subscription) => p.id === id);
    return plan?.name ?? "—";
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload: Partial<AdminUserPayload> = {
        name: draft.name.trim(),
        email: draft.email.trim(),
        role: draft.role,
        subscription_id: draft.subscription_id,
        is_active: draft.is_active,
        subscription_expires_at: draft.subscription_expires_at || null,
      };

      if (draft.password) payload.password = draft.password;

      if (draft.id === null) {
        await createAdminUser({
          ...(payload as AdminUserPayload),
          password: draft.password,
        });
        setNotice(`User ${draft.email} created.`);
      } else {
        await updateAdminUser(draft.id, payload);
        setNotice(`User ${draft.email} updated.`);
      }
      setDraft(null);
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function quickUpdate(user: AdminUser, patch: Partial<AdminUserPayload>) {
    setBusy(true);
    setError(null);
    try {
      await updateAdminUser(user.id, patch);
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(user: AdminUser) {
    if (!confirm(`Delete ${user.email}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminUser(user.id);
      setNotice(`User ${user.email} deleted.`);
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    if (!resetFor) return;
    setBusy(true);
    setError(null);
    try {
      await resetAdminUserPassword(resetFor.id, resetValue);
      setNotice(`Password reset for ${resetFor.email}.`);
      setResetFor(null);
      setResetValue("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Users</h2>
          <p className="text-xs text-slate-500">
            {total} account{total === 1 ? "" : "s"} · assign plans and roles here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search name or email…"
            className="w-56 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <button
            onClick={() => setDraft({ ...EMPTY, subscription_id: plans[0]?.id ?? null })}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + New user
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading users…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {u.name}
                      {u.id === me?.id && (
                        <span className="ml-2 text-[10px] text-slate-400">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={busy || u.id === me?.id}
                      onChange={(e) =>
                        quickUpdate(u, { role: e.target.value as "user" | "admin" })
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.subscription_id ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        quickUpdate(u, {
                          subscription_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="">— none —</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {u.subscription_expires_at ? (
                      <div className="mt-0.5 text-[10px] text-amber-600">
                        expires {u.subscription_expires_at.slice(0, 10)}
                      </div>
                    ) : u.subscription_id ? (
                      <div className="mt-0.5 text-[10px] text-emerald-600">
                        auto-renews
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={u.is_active}
                      disabled={busy || u.id === me?.id}
                      onChange={(e) => quickUpdate(u, { is_active: e.target.checked })}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.last_login_at ? u.last_login_at.slice(0, 10) : "never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDraft(toDraft(u))}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setResetFor(u);
                          setResetValue("");
                        }}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Password
                      </button>
                      <button
                        onClick={() => remove(u)}
                        disabled={busy || u.id === me?.id}
                        className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="tabular-nums text-slate-600">
            Page {page} of {lastPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {draft && (
        <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            {draft.id === null ? "New user" : `Edit ${draft.name}`}
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Name
              </label>
              <input
                className={field}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                type="email"
                className={field}
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {draft.id === null ? "Password" : "New password (optional)"}
              </label>
              <input
                type="password"
                className={field}
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role
              </label>
              <select
                className={field}
                value={draft.role}
                onChange={(e) =>
                  setDraft({ ...draft, role: e.target.value as "user" | "admin" })
                }
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Subscription
              </label>
              <select
                className={field}
                value={draft.subscription_id ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    subscription_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">— none —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.features.length} features)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Expires (optional)
              </label>
              <input
                type="date"
                className={field}
                value={draft.subscription_expires_at}
                onChange={(e) =>
                  setDraft({ ...draft, subscription_expires_at: e.target.value })
                }
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            />
            Account is active
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDraft(null)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={
                busy ||
                !draft.name.trim() ||
                !draft.email.trim() ||
                (draft.id === null && draft.password.length < 8)
              }
              className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save user"}
            </button>
          </div>
        </div>
      )}

      {resetFor && (
        <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            Reset password for {resetFor.email}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            This signs the user out everywhere by invalidating their active token.
          </p>
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            value={resetValue}
            onChange={(e) => setResetValue(e.target.value)}
            className={`${field} mt-3`}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setResetFor(null)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={doReset}
              disabled={busy || resetValue.length < 8}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Reset password
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Currently assigned plans:{" "}
        {plans.map((p) => `${p.name} (${planName(p.id)})`).join(", ") || "none"}
      </p>
    </div>
  );
}
