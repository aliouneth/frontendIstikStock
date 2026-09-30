"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SiteLogo from "@/components/SiteLogo";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  cancelCheckout,
  confirmCheckout,
  createCheckout,
  fetchQuote,
} from "@/lib/api";
import type { BillingPeriod, Checkout, PaymentIntent, Quote } from "@/lib/types";

type Stage = "select" | "review" | "paid";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function when(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CheckoutPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const { plans, user, ready, isAdmin, refresh, featureLabels } = useAuth();

  const plan = useMemo(
    () => plans.find((p) => p.slug === params.slug) ?? null,
    [plans, params.slug]
  );

  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [autoRenew, setAutoRenew] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [stage, setStage] = useState<Stage>("select");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-quote whenever the price page options change, so the displayed total is
  // always the server's number rather than anything computed in the browser.
  useEffect(() => {
    if (!plan) return;
    let cancelled = false;

    fetchQuote(plan.id, period, autoRenew)
      .then((data) => {
        if (!cancelled && data.quote) setQuote(data.quote);
      })
      .catch(() => {
        // Fall back to the plan's own list price so the page still renders.
        if (cancelled) return;
        setQuote({
          billing_period: period,
          is_annual: period === "annual",
          auto_renew: autoRenew,
          amount: period === "annual" ? plan.annual_price_effective : plan.price,
          currency: plan.currency,
          savings: period === "annual" ? plan.annual_savings : 0,
          renews_at: null,
          line_items: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [plan, period, autoRenew, user]);

  async function startCheckout() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createCheckout({
        subscription_id: plan.id,
        billing_period: period,
        auto_renew: autoRenew,
      });
      setCheckout(res.checkout);
      setPayment(res.payment);
      setStage("review");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!checkout) return;
    setBusy(true);
    setError(null);
    try {
      const res = await confirmCheckout(checkout.id);
      setCheckout(res.checkout);
      setStage("paid");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment did not go through.");
    } finally {
      setBusy(false);
    }
  }

  async function abandon() {
    if (checkout) {
      try {
        await cancelCheckout(checkout.id);
      } catch {
        // Non-fatal: the checkout expires on its own.
      }
    }
    setCheckout(null);
    setPayment(null);
    setStage("select");
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="flex flex-col items-center">
          <SiteLogo size="md" priority />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Sign in to continue</h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            We need an account to attach the subscription to.
          </p>
        </div>
        <Link
          href={`/login?next=/checkout/${params.slug}`}
          className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Sign in
        </Link>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-lg font-bold text-slate-900">Plan not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          That plan is no longer offered.
        </p>
        <Link href="/#plans" className="mt-4 inline-block text-sm font-semibold text-sky-700 hover:underline">
          ← Back to plans
        </Link>
      </main>
    );
  }

  if (user.subscription_id === plan.id || isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-lg font-bold text-slate-900">
          {isAdmin ? "Administrators have every plan" : "This is your current plan"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Pick a different plan from the plans section to change your subscription.
        </p>
        <Link href="/#plans" className="mt-4 inline-block text-sm font-semibold text-sky-700 hover:underline">
          ← Back to plans
        </Link>
      </main>
    );
  }

  const collectsPayment = payment?.collects_payment ?? false;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/#plans" className="text-sm font-semibold text-sky-700 hover:underline">
        ← Back to plans
      </Link>

      <div className="mt-4 flex flex-col items-center text-center">
        <SiteLogo size="md" priority />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {stage === "paid" ? "You're all set" : `Checkout — ${plan.name}`}
        </h1>
      </div>

      {stage === "paid" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-semibold text-emerald-800">
            Your plan is now {checkout?.plan_name}.
          </p>
          {!collectsPayment && (
            <p className="mt-2 text-xs text-emerald-700">
              Note: no payment was collected because no payment processor is
              configured yet. Stripe will take over this step when enabled.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-600">
            {checkout?.auto_renew
              ? "Auto-renew is on — your plan stays active and renews each period."
              : checkout?.period_ends_at
              ? `Your plan runs until ${when(checkout.period_ends_at)}. Renew any time before then.`
              : "This plan does not auto-renew."}
          </p>
          <button
            onClick={() => {
              router.push("/");
              router.refresh();
            }}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to dashboard
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Step 1 — billing period */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">1. Billing period</h2>

              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["monthly", "annual"] as BillingPeriod[]).map((option) => {
                  const active = period === option;
                  const amount =
                    option === "annual" ? plan.annual_price_effective : plan.price;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPeriod(option)}
                      disabled={stage === "review"}
                      aria-pressed={active}
                      className={`rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white hover:border-slate-400"
                      }`}
                    >
                      <div className="text-xs font-semibold capitalize">{option}</div>
                      <div
                        className={`mt-1 font-mono text-lg font-bold ${
                          active ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {money(amount, plan.currency)}
                      </div>
                      {option === "annual" && plan.annual_savings > 0 && (
                        <div
                          className={`mt-0.5 text-[11px] font-medium ${
                            active ? "text-emerald-300" : "text-emerald-700"
                          }`}
                        >
                          Save {money(plan.annual_savings, plan.currency)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  disabled={stage === "review"}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">
                    Renew automatically
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {autoRenew
                      ? `Your plan stays active and renews every ${
                          period === "annual" ? "year" : "month"
                        } until you cancel.`
                      : `Access ends after the paid term${
                          period === "annual" ? " (12 months)" : " (1 month)"
                        }. Renew manually any time.`}
                  </span>
                </span>
              </label>
            </section>

            {/* Step 2 — payment */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">2. Payment</h2>

              {stage === "select" ? (
                <p className="mt-2 text-xs text-slate-500">
                  Review the total, then continue to payment.
                </p>
              ) : payment && !collectsPayment ? (
                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">
                    {payment.label ?? "No payment processor configured"}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                    {payment.message ??
                      "Your plan will be activated without a charge until Stripe is enabled."}
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">
                    Card details go here
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    This is where the Stripe Payment Element mounts once the
                    server-side driver is enabled.
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {stage === "select" ? (
                  <button
                    onClick={startCheckout}
                    disabled={busy}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {busy ? "Preparing…" : "Continue to payment"}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={pay}
                      disabled={busy}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy
                        ? "Processing…"
                        : collectsPayment
                        ? `Pay ${money(quote?.amount ?? 0, quote?.currency ?? plan.currency)}`
                        : "Confirm and activate"}
                    </button>
                    <button
                      onClick={abandon}
                      disabled={busy}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Summary */}
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Order summary</h2>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-sm text-slate-700">{plan.name}</span>
              <span className="text-[11px] capitalize text-slate-500">{period}</span>
            </div>

            <ul className="mt-3 space-y-1.5">
              {Object.entries(featureLabels).map(([key, label]) => {
                const on = (plan.features as string[]).includes(key);
                return (
                  <li
                    key={key}
                    className={`flex items-start gap-2 text-[11px] ${
                      on ? "text-slate-600" : "text-slate-300 line-through"
                    }`}
                  >
                    <span>{on ? "✓" : "✕"}</span>
                    {label}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>
                  {plan.name} — {period}
                </span>
                <span className="font-mono">
                  {money(quote?.amount ?? 0, quote?.currency ?? plan.currency)}
                </span>
              </div>
              {quote && quote.savings > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Annual saving</span>
                  <span className="font-mono">
                    −{money(quote.savings, quote.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Due today</span>
                <span className="font-mono">
                  {money(quote?.amount ?? 0, quote?.currency ?? plan.currency)}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              {autoRenew
                ? `Renews automatically every ${
                    period === "annual" ? "year" : "month"
                  } until cancelled.`
                : "One-time payment for this term. No automatic renewal."}
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
