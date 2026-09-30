"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SiteLogo from "@/components/SiteLogo";
import AccountBar from "@/components/AccountBar";
import { LockedPanel } from "@/components/Locked";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, evaluateStock, searchStocks } from "@/lib/api";
import type { StockEvaluation, StockSearchResult } from "@/lib/types";

const FEATURE_LABELS: Record<string, string> = {
  ret_20d: "20d momentum",
  ret_5d: "5d momentum",
  ret_1d: "1d move",
  ret_60d: "60d trend",
  rel_volume: "Volume surge",
  volume_ratio_5_20: "Volume build",
  trend_slope_20: "Uptrend",
  range_pos_20: "Near highs",
  fed_trend_63: "Fed trend",
  fed_funds_rate: "Fed rate",
  cpi_trend_63: "CPI trend",
  vix_level: "VIX",
  vix_change_10: "VIX change",
  russell2000_ret_20: "Russell 2000",
  sp500_ret_20: "S&P 500",
  nasdaq_ret_20: "Nasdaq",
  vol_20d: "Volatility",
  beta_rut_20: "Small-cap beta",
  dist_low_60: "Off 60d low",
  offering_recent_30d: "Recent offering",
  split_recent_90d: "Recent split",
  down_days_ratio_10: "Up-day streak",
};

function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  })}`;
}

function fmtMktCap(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toLocaleString("en-US")}`;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
          style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
        />
      </div>
      <span className="w-14 text-right font-mono text-2xl font-semibold tabular-nums text-slate-900">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

function FeatureChips({ features }: { features: Record<string, number> }) {
  const entries = Object.entries(features).slice(0, 6);
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600"
          title={key}
        >
          {FEATURE_LABELS[key] ?? key}:{" "}
          {Math.abs(value) < 1 && value !== 0
            ? value.toFixed(2)
            : value.toFixed(Math.abs(value) >= 100 ? 0 : 1)}
        </span>
      ))}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const W = 560;
  const H = 120;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - 8 - ((v - min) / range) * (H - 16);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = points[points.length - 1] >= points[0];
  const stroke = up ? "#10b981" : "#f43f5e";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-28 w-full"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function RankedEvaluation({
  evaluation,
}: {
  evaluation: StockEvaluation & { price_history: { date: string; close: number }[] };
}) {
  if (!evaluation.eligible) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-8">
        <div className="text-sm font-semibold text-amber-900">
          {evaluation.ticker} · {evaluation.name ?? "—"}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-amber-800">
          This symbol exists in the tracked universe but cannot be scored
          today: <strong>{evaluation.reason}</strong>
        </p>
      </div>
    );
  }

  const { item } = evaluation;
  const closes = evaluation.price_history.map(p => p.close);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900">
                {evaluation.ticker}
              </span>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                {evaluation.exchange ?? "—"}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-slate-500">{evaluation.name}</div>
            <div className="mt-1 text-[11px] text-slate-400">
              {evaluation.sector} · mkt cap {fmtMktCap(evaluation.market_cap)}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wide text-emerald-700">
              Rank
            </div>
            <div className="font-mono text-xl font-bold text-emerald-700">
              #{evaluation.rank}
              <span className="text-xs font-normal text-emerald-600">
                {" "}
                / {evaluation.peers}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
            <span>Model score</span>
            <span>
              top {Math.round(evaluation.percentile)}% of {evaluation.peers}{" "}
              candidates
            </span>
          </div>
          <ScoreBar score={item.score} />
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
            <span>last close {fmtPrice(item.price)}</span>
            <span>model {evaluation.model_version}</span>
          </div>
        </div>
      </div>

      {closes.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-[11px] uppercase tracking-wide text-slate-500">
            Last {closes.length} closes
          </div>
          <Sparkline points={closes} />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          Why the model likes it
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {item.rationale}
        </p>
        {Object.keys(item.key_features).length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">
              Key drivers
            </div>
            <FeatureChips features={item.key_features} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockLookupPage() {
  const { can, ready, user, isAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<
    (StockEvaluation & { price_history: { date: string; close: number }[] }) | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const allow = can("stock_lookup");

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!searchBoxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!allow || q.length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const before = q;
      try {
        const res = await searchStocks(q);
        if (before === query.trim()) {
          setResults(res.results);
          setOpen(true);
        }
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        if (before === query.trim()) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, allow]);

  async function pick(stock: StockSearchResult) {
    setOpen(false);
    setError(null);
    setEvaluating(true);
    setEvaluation(null);
    try {
      const res = await evaluateStock(stock.ticker);
      setEvaluation(res.evaluation);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not evaluate that symbol."
      );
    } finally {
      setEvaluating(false);
    }
  }

  function submit() {
    const q = query.trim().toUpperCase();
    if (q.length === 0) return;
    pick({ ticker: q, name: null, sector: null, exchange: null, last_price: null });
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <SiteLogo size="lg" priority />
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Search for any tracked US penny stock and see how it ranks
              against the model&apos;s full universe.
            </p>
          </div>
          <AccountBar />
        </header>
        <section className="mt-6">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-16 text-center text-slate-500">
            Loading…
          </div>
        </section>
      </main>
    );
  }

  if (!allow) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <SiteLogo size="lg" priority />
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Search for any tracked US penny stock and see how it ranks
              against the model&apos;s full universe.
            </p>
          </div>
          <AccountBar />
        </header>
        <nav className="mt-6 text-sm text-slate-500">
          <Link href="/" className="text-sky-700 hover:underline">
            ← Back to dashboard
          </Link>
        </nav>
        <section className="mt-6">
          <LockedPanel
            feature="stock_lookup"
            message="Single-stock model lookup is available to Premium subscribers. Ask an administrator to upgrade your subscription to unlock it."
          />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <SiteLogo size="lg" priority />
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Search for any tracked US penny stock and see how it ranks
            against the model&apos;s full universe.
          </p>
        </div>
        <AccountBar />
      </header>

      <nav className="mt-6 text-sm text-slate-500">
        <Link href="/" className="text-sky-700 hover:underline">
          ← Back to dashboard
        </Link>
      </nav>

      <section className="mt-6">
        <div ref={searchBoxRef} className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex gap-2"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Search ticker or company name, e.g. CAN or ATA Creative"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <button
              type="submit"
              disabled={evaluating || searching}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {evaluating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Scoring…
                </>
              ) : (
                "Evaluate"
              )}
            </button>
          </form>

          {open && results.length > 0 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {results.map((r) => (
                <button
                  key={r.ticker}
                  onClick={() => pick(r)}
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left transition last:border-0 hover:bg-sky-50"
                >
                  <span className="min-w-0">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      {r.ticker}
                    </span>
                    <span className="ml-2 truncate text-xs text-slate-500">
                      {r.name ?? "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {r.exchange ?? "—"} · {fmtPrice(r.last_price)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-xl">
              Searching…
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {user && !isAdmin
            ? `You are on${user.subscription ? ` ${user.subscription.name}` : " a"} plan. Single-stock lookup is a Premium feature.`
            : ""}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6">
          {evaluation === null ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-14 text-center text-sm text-slate-500">
              Evaluate a ticker to see its model score, rank and rationale.
              The ranking is recomputed against today&apos;s full universe, so
              the number is comparable to the “Today’s picks” list.
            </div>
          ) : (
            <RankedEvaluation evaluation={evaluation} />
          )}
        </div>
      </section>

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500">
        <p>
          Research prototype — model scores estimate forward returns from
          historical pattern learning, not financial advice. Penny stocks are
          highly volatile and illiquid.
        </p>
      </footer>
    </main>
  );
}