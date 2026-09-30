"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function AccountBar() {
  const { user, plans, isAdmin, logout, ready, featureLabels } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return <div className="h-8 w-40 animate-pulse rounded-full bg-slate-200" />;
  }

  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Create account
        </Link>
      </div>
    );
  }

  const plan = user.subscription;

  return (
    <div className="flex flex-col items-end gap-1.5 text-sm">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {plan ? (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              plan.price > 0
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-slate-100 text-slate-600"
            }`}
            title={`${plan.features.length} of ${Object.keys(featureLabels).length} features enabled`}
          >
            {plan.name}
            {plan.price > 0 ? ` · $${plan.price}/${plan.billing_period}` : " · free"}
          </span>
        ) : (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            No plan
          </span>
        )}

        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-lg border border-slate-900 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Admin
          </Link>
        )}

        <button
          onClick={async () => {
            setBusy(true);
            await logout();
            setBusy(false);
          }}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>

      <div className="text-right leading-tight">
        <div className="font-semibold text-slate-800">{user.name}</div>
        <div className="text-[11px] text-slate-500">{user.email}</div>
      </div>

      {plans.some((p) => p.is_default) && !isAdmin && (
        <Link
          href="/#plans"
          className="text-[11px] font-medium text-sky-700 underline-offset-2 hover:underline"
        >
          Change plan
        </Link>
      )}
    </div>
  );
}
