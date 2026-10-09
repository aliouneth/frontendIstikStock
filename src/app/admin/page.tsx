"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatsPanel from "@/components/admin/StatsPanel";
import SubscriptionsPanel from "@/components/admin/SubscriptionsPanel";
import UsersPanel from "@/components/admin/UsersPanel";
import SiteLogo from "@/components/SiteLogo";
import { useAuth } from "@/components/AuthProvider";

export default function AdminPage() {
  const { user, ready, isAdmin } = useAuth();
  const [tab, setTab] = useState<"stats" | "subscriptions" | "users">("stats");

  useEffect(() => {
    if (ready && user && !isAdmin) setTab("stats");
  }, [ready, user, isAdmin]);

  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-500">
        Loading…
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Sign in required</h1>
        <p className="mt-1 text-sm text-slate-500">
          The administration area is only available to signed-in administrators.
        </p>
        <Link
          href="/login?next=/admin"
          className="mt-5 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Access denied</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have administrator privileges.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SiteLogo size="sm" priority />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Administration</h1>
            <p className="text-xs text-slate-500">
              Site stats, subscriptions, the features they unlock, and user access.
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </header>

      <nav className="mt-6 flex w-fit rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
        {(
          [
            ["stats", "Site stats"],
            ["subscriptions", "Subscriptions"],
            ["users", "Users"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 transition ${
              tab === key ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="mt-6">
        {tab === "stats" ? (
          <StatsPanel />
        ) : tab === "subscriptions" ? (
          <SubscriptionsPanel />
        ) : (
          <UsersPanel />
        )}
      </section>
    </main>
  );
}
