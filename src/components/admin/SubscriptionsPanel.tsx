"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createAdminSubscription,
  deleteAdminSubscription,
  fetchPlans,
  updateAdminSubscription,
  type AdminSubscriptionPayload,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import type { FeatureKey, Subscription } from "@/lib/types";

interface Draft {
  id: number | null;
  name: string;
  slug: string;
  description: string;
  price: string;
  annual_price: string;
  billing_period: string;
  features: FeatureKey[];
  is_active: boolean;
  is_default: boolean;
  sort_order: string;
}

const EMPTY: Draft = {
  id: null,
  name: "",
  slug: "",
  description: "",
  price: "0",
  annual_price: "",
  billing_period: "monthly",
  features: [],
  is_active: true,
  is_default: false,
  sort_order: "0",
};

function toDraft(plan: Subscription): Draft {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description ?? "",
    price: String(plan.price),
    annual_price: plan.annual_price === null ? "" : String(plan.annual_price),
    billing_period: plan.billing_period,
    features: [...plan.features],
    is_active: plan.is_active,
    is_default: plan.is_default,
    sort_order: String(plan.sort_order),
  };
}

function toPayload(draft: Draft): AdminSubscriptionPayload {
  return {
    name: draft.name.trim(),
    slug: draft.slug.trim() || undefined,
    description: draft.description.trim() || null,
    price: Number(draft.price) || 0,
    annual_price: draft.annual_price.trim() === "" ? null : Number(draft.annual_price) || 0,
    billing_period: draft.billing_period,
    features: draft.features,
    is_active: draft.is_active,
    is_default: draft.is_default,
    sort_order: Number(draft.sort_order) || 0,
  };
}

export default function SubscriptionsPanel() {
  const { featureLabels, refresh } = useAuth();
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const labels = useMemo(
    () =>
      Object.entries(featureLabels) as [FeatureKey, string][],
    [featureLabels]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPlans();
      setPlans(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (draft.id === null) {
        await createAdminSubscription(toPayload(draft));
        setNotice(`Subscription "${draft.name}" created.`);
      } else {
        await updateAdminSubscription(draft.id, toPayload(draft));
        setNotice(`Subscription "${draft.name}" updated.`);
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

  async function remove(plan: Subscription) {
    if (!confirm(`Delete subscription "${plan.name}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminSubscription(plan.id);
      setNotice(`Subscription "${plan.name}" deleted.`);
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(plan: Subscription, field: "is_active" | "is_default") {
    setBusy(true);
    setError(null);
    try {
      await updateAdminSubscription(plan.id, { [field]: !plan[field] } as Partial<AdminSubscriptionPayload>);
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Subscriptions</h2>
          <p className="text-xs text-slate-500">
            The default plan applies to guests and new sign-ups. Tick the features each plan unlocks.
          </p>
        </div>
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + New subscription
        </button>
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
        <p className="text-sm text-slate-500">Loading plans…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Features</th>
                <th className="px-4 py-3">Default</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{plan.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{plan.slug}</div>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                    ${plan.price}
                    <span className="text-[11px] text-slate-400">/{plan.billing_period}</span>
                    {plan.annual_price_effective > 0 && (
                      <div className="text-[11px] text-slate-400">
                        ${plan.annual_price_effective}/yr
                        {plan.annual_savings > 0 && (
                          <span className="ml-1 text-emerald-600">
                            save ${plan.annual_savings}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{plan.users_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-sm flex-wrap gap-1">
                      {labels.map(([key, label]) => {
                        const on = plan.features.includes(key);
                        return (
                          <span
                            key={key}
                            className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
                              on
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-400 line-through"
                            }`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={plan.is_default}
                      disabled={busy}
                      onChange={() => toggle(plan, "is_default")}
                      title="Default plan for guests and new users"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={plan.is_active}
                      disabled={busy}
                      onChange={() => toggle(plan, "is_active")}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDraft(toDraft(plan))}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(plan)}
                        disabled={busy}
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

      {draft && (
        <SubscriptionForm
          draft={draft}
          setDraft={setDraft}
          labels={labels}
          busy={busy}
          onCancel={() => setDraft(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function SubscriptionForm({
  draft,
  setDraft,
  labels,
  busy,
  onCancel,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  labels: [FeatureKey, string][];
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const field =
    "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

  function toggleFeature(key: FeatureKey) {
    const has = draft.features.includes(key);
    setDraft({
      ...draft,
      features: has
        ? draft.features.filter((f) => f !== key)
        : [...draft.features, key],
    });
  }

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        {draft.id === null ? "New subscription" : `Edit "${draft.name}"`}
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
            Slug (optional)
          </label>
          <input
            className={field}
            placeholder="auto from name"
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Billing period
          </label>
          <select
            className={field}
            value={draft.billing_period}
            onChange={(e) => setDraft({ ...draft, billing_period: e.target.value })}
          >
            {["monthly", "annual"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Monthly price
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={field}
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Annual price
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Leave blank for 10× monthly"
            className={field}
            value={draft.annual_price}
            onChange={(e) => setDraft({ ...draft, annual_price: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sort order
          </label>
          <input
            type="number"
            min="0"
            className={field}
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-4 pb-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            />
            Active
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.is_default}
              onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })}
            />
            Default
          </label>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Description
        </label>
        <textarea
          rows={2}
          className={`${field} mt-1`}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Features unlocked by this plan
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {labels.map(([key, label]) => (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                draft.features.includes(key)
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={draft.features.includes(key)}
                onChange={() => toggleFeature(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={busy || !draft.name.trim()}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save subscription"}
        </button>
      </div>
    </div>
  );
}
