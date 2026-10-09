"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ApiError, fetchAdminStats } from "@/lib/api";
import type { AdminStats } from "@/lib/types";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function fmtMoney(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function StatsPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminStats();
      setStats(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !stats) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading stats…</p>;
  }

  if (error && !stats) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const maxPlanUsers = Math.max(1, ...stats.plans.map((p) => p.users));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Site stats</h2>
          <p className="text-xs text-slate-500">
            Snapshot generated {fmtDate(stats.generated_at)}.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Users" value={stats.users.total} hint={`${stats.unassigned_plan} without a plan`} />
        <StatCard label="Active" value={stats.users.active} hint={`${stats.users.inactive} deactivated`} />
        <StatCard label="Admins" value={stats.users.admins} />
        <StatCard label="Seen (7d)" value={stats.users.seen_7d} hint={`${stats.users.never_signed_in} never signed in`} />
        <StatCard label="New today" value={stats.users.new_today} />
        <StatCard label="New (7d)" value={stats.users.new_7d} />
        <StatCard label="New (30d)" value={stats.users.new_30d} />
        <StatCard label="Watchlists" value={stats.watchlists.lists} hint={`${stats.watchlists.items} tracked`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Users by plan" subtitle="Active accounts enrolled per subscription.">
          <div className="space-y-3">
            {stats.plans.map((plan) => (
              <div key={plan.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{plan.name}</span>
                  <span className="text-slate-500">
                    {plan.users} · {fmtMoney(plan.price)}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width: `${Math.round((plan.users / maxPlanUsers) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.plans.length === 0 && <p className="text-sm text-slate-500">No plans configured.</p>}
          </div>
        </Panel>

        <Panel title="Billing" subtitle="Checkout activity across all accounts.">
          <Row label="Paid" value={stats.billing.paid} />
          <Row label="Pending" value={stats.billing.pending} />
          <Row label="Failed" value={stats.billing.failed} />
          <Row label="Revenue" value={fmtMoney(stats.billing.revenue)} />
        </Panel>

        <Panel title="Watchlists" subtitle="Premium stock tracking.">
          <Row label="Lists" value={stats.watchlists.lists} />
          <Row label="Tracked stocks" value={stats.watchlists.items} />
          <Row label="Users using them" value={stats.watchlists.users} />
        </Panel>

        <Panel title="Content & model" subtitle="Stock universe and analysis pipeline.">
          <Row label="Stocks" value={stats.content.stocks} />
          <Row label="Recommendations" value={stats.content.recommendations} />
          <Row label="Latest picks" value={stats.content.latest_recommendation_date ?? "—"} />
          <Row label="Model runs" value={stats.content.model_runs} />
          <Row
            label="Last run"
            value={
              stats.content.last_model_run ? (
                <span
                  className={
                    stats.content.last_model_run.status === "success"
                      ? "text-emerald-600"
                      : stats.content.last_model_run.status === "failed"
                        ? "text-rose-600"
                        : "text-slate-600"
                  }
                >
                  {stats.content.last_model_run.run_type} · {stats.content.last_model_run.status}
                </span>
              ) : (
                "—"
              )
            }
          />
        </Panel>
      </div>
    </div>
  );
}
