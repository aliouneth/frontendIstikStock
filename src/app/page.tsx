"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import HistoryCharts from "@/components/HistoryCharts";
import {
  fetchHistory,
  fetchModelStatus,
  fetchToday,
  runAnalysis,
  runNewsScan,
} from "@/lib/api";
import type {
  Evaluation,
  HistoryResponse,
  ModelInfo,
  NewsScanItem,
  NewsScanResponse,
  Recommendation,
  RunAnalysisResponse,
  TodayResponse,
} from "@/lib/types";

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

function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pctClass(v: number | null | undefined): string {
  if (v === null || v === undefined) return "text-slate-400";
  return v >= 0 ? "text-emerald-600" : "text-rose-600";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex min-w-[110px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
          style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs tabular-nums text-slate-600">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

function FeatureChips({ features }: { features: Record<string, number> }) {
  const entries = Object.entries(features).slice(0, 5);
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

function EvalStrip({ evaluation }: { evaluation: Evaluation | null }) {
  if (!evaluation || evaluation.recommendations_evaluated === undefined) {
    return null;
  }
  const stats: [string, string][] = [
    ["Picks evaluated", String(evaluation.recommendations_evaluated)],
    ["Avg pick return", fmtPct(evaluation.avg_pick_return_pct)],
    ["Avg benchmark", fmtPct(evaluation.avg_benchmark_return_pct)],
    ["Avg excess", fmtPct(evaluation.avg_excess_pct)],
    ["Hit rate", `${evaluation.hit_rate_pct ?? "—"}%`],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-1 font-mono text-lg tabular-nums text-slate-900">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelChip({
  model,
  apiOffline,
}: {
  model: ModelInfo | null;
  apiOffline: boolean;
}) {
  if (apiOffline) {
    return (
      <span className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs text-rose-700">
        API offline — backend not reachable
      </span>
    );
  }
  if (!model?.trained) {
    return (
      <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-700">
        Model not trained
      </span>
    );
  }
  const holdout = model.metrics?.holdout;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 font-mono text-sky-700">
        model {model.version}
      </span>
      <span>trained {model.trained_at?.slice(0, 10)}</span>
      {holdout?.spearman !== undefined && (
        <span className="hidden sm:inline">
          holdout rank-corr ρ={holdout.spearman.toFixed(3)} · R²=
          {holdout.r2?.toFixed(3)}
        </span>
      )}
    </div>
  );
}

function TodayTable({ items }: { items: Recommendation[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Ticker</th>
            <th className="px-4 py-3">Sector</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3">Model score</th>
            <th className="px-4 py-3">Since rec.</th>
            <th className="px-4 py-3">Rationale</th>
            <th className="px-4 py-3">Key drivers</th>
          </tr>
        </thead>
        <tbody>
          {items.map((rec) => (
            <tr
              key={rec.ticker}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <td className="px-4 py-3 font-mono text-slate-400">{rec.rank}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-900">{rec.ticker}</div>
                <div className="max-w-[160px] truncate text-xs text-slate-500">
                  {rec.name}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{rec.sector}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                {fmtPrice(rec.price_at_recommendation)}
              </td>
              <td className="px-4 py-3">
                <ScoreBar score={rec.score} />
              </td>
              <td
                className={`px-4 py-3 font-mono tabular-nums ${pctClass(rec.performance.last_pct)}`}
              >
                {fmtPct(rec.performance.last_pct)}
                <div className="text-[10px] text-slate-400">
                  {rec.performance.days_tracked > 0
                    ? `${rec.performance.days_tracked}d tracked`
                    : "no data"}
                </div>
              </td>
              <td className="max-w-[340px] px-4 py-3 text-xs leading-relaxed text-slate-500">
                {rec.rationale}
              </td>
              <td className="px-4 py-3">
                <FeatureChips features={rec.key_features} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtAge(hours: number): string {
  return hours < 24 ? `${Math.round(hours)}h` : `${Math.round(hours / 24)}d`;
}

const SIGNAL_STYLE: Record<NewsScanItem["headlines"][number]["signal"], string> = {
  best: "bg-amber-400",
  positive: "bg-emerald-500",
  negative: "bg-rose-500",
  neutral: "bg-slate-300",
};

const SIGNAL_LABEL: Record<NewsScanItem["headlines"][number]["signal"], string> = {
  best: "top catalyst",
  positive: "catalyst",
  negative: "risk",
  neutral: "",
};

function NewsCard({ item }: { item: NewsScanItem }) {
  const hasRisk = item.reasoning.includes("Risk flags");

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] text-white">
              #{item.rank}
            </span>
            <span className="text-base font-bold text-slate-900">
              {item.ticker}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {item.sector ?? "—"}
            </span>
            {hasRisk && (
              <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-600">
                risk flags
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {item.name}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl font-semibold text-slate-900">
            {item.surge_score.toFixed(0)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">
            surge
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-mono text-sm text-slate-800">
            {item.model_score.toFixed(0)}
          </div>
          <div className="text-[10px] text-slate-500">model</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-mono text-sm text-slate-800">
            {item.news_score}
          </div>
          <div className="text-[10px] text-slate-500">news</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-mono text-sm text-slate-800">
            {item.key_features.rel_volume !== undefined
              ? `${item.key_features.rel_volume.toFixed(1)}×`
              : "—"}
          </div>
          <div className="text-[10px] text-slate-500">vs 20d vol</div>
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <span className="text-xs text-emerald-700">
          Now {fmtPrice(item.price)}
        </span>
        <span className="font-mono text-sm font-semibold text-emerald-700">
          Target {fmtPrice(item.target_price)} (+{item.target_pct}%)
        </span>
      </div>
      <div className="mt-1 text-right text-[10px] text-slate-400">
        sell within ~{item.horizon_days} trading days
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        {item.reasoning}
      </p>

      <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        {item.headlines.map((h, i) => (
          <li key={`${h.url}-${i}`}>
            <a
              href={h.url}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <div className="flex gap-2">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SIGNAL_STYLE[h.signal]}`}
                />
                <div className="min-w-0">
                  <span className="line-clamp-2 text-xs leading-snug text-slate-600 group-hover:text-sky-700">
                    {h.title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {h.publisher || "wire"} · {fmtAge(h.age_hours)} ago
                    {SIGNAL_LABEL[h.signal]
                      ? ` · ${SIGNAL_LABEL[h.signal]}`
                      : ""}
                  </span>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryList({ history }: { history: HistoryResponse }) {
  const [view, setView] = useState<"cards" | "graphs">("cards");

  if (history.history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-500">
        No recommendation history yet. Run the daily analysis first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {history.days} days · {history.history.length} recommendation days
        </span>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
          <button
            onClick={() => setView("cards")}
            className={`rounded-lg px-4 py-1.5 transition ${
              view === "cards"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setView("graphs")}
            className={`rounded-lg px-4 py-1.5 transition ${
              view === "graphs"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Graphs
          </button>
        </div>
      </div>

      <EvalStrip evaluation={history.evaluation} />

      {view === "graphs" ? (
        <HistoryCharts history={history.history} />
      ) : (
        history.history.map((day) => (
        <div
          key={day.date}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {fmtDate(day.date)}
              </div>
              <div className="text-xs text-slate-500">{day.picks} picks</div>
            </div>
            <div className="flex gap-4 font-mono text-sm tabular-nums">
              <span className={pctClass(day.avg_return_pct)}>
                picks {fmtPct(day.avg_return_pct)}
              </span>
              <span className={pctClass(day.avg_benchmark_pct)}>
                bench {fmtPct(day.avg_benchmark_pct)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {day.items.map((rec) => (
              <div
                key={`${day.date}-${rec.ticker}`}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">
                      {rec.ticker}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      {rec.sector}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-sm tabular-nums ${pctClass(rec.performance.last_pct)}`}
                  >
                    {fmtPct(rec.performance.last_pct)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    rec {fmtPrice(rec.price_at_recommendation)} →{" "}
                    {rec.performance.current_price !== null
                      ? fmtPrice(rec.performance.current_price)
                      : "—"}
                  </span>
                  <span>score {rec.score.toFixed(0)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full ${rec.performance.last_pct !== null && rec.performance.last_pct < 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{
                      width: `${Math.max(4, Math.min(100, Math.abs(rec.performance.last_pct ?? 0) * 4))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                  {rec.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
        ))
      )}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"today" | "history">("today");
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [apiOffline, setApiOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunAnalysisResponse | null>(null);
  const [newsScan, setNewsScan] = useState<NewsScanResponse | null>(null);
  const [newsScanning, setNewsScanning] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const newsSectionRef = useRef<HTMLElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    const [todayRes, historyRes, modelRes] = await Promise.allSettled([
      fetchToday(),
      fetchHistory(30),
      fetchModelStatus(),
    ]);

    if (todayRes.status === "fulfilled") {
      setToday(todayRes.value);
    } else {
      setToday(null);
      setNotice((todayRes.reason as Error).message);
    }
    if (historyRes.status === "fulfilled") {
      setHistory(historyRes.value);
    }
    if (modelRes.status === "fulfilled") {
      setModel(modelRes.value.model);
      setApiOffline(false);
    } else {
      setApiOffline(true);
      setModel(null);
    }
  }, []);

  useEffect(() => {
    loadAll()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [loadAll]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const result = await runAnalysis();
      setRunResult(result);
      await loadAll();
      setTab("today");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const handleNewsScan = async () => {
    setNewsScanning(true);
    setNewsError(null);
    try {
      setNewsScan(await runNewsScan());
      requestAnimationFrame(() => {
        newsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setNewsError((e as Error).message);
    } finally {
      setNewsScanning(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="hidden">
        <Image
          src="/dua.png"
          alt="Dua — istighfar and supplication for this world and the next"
          width={1546}
          height={73}
          priority
          className="h-auto w-full"
        />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="IstikStocks"
              width={1024}
              height={1024}
              className="h-[120px] w-[120px] rounded-2xl"
            />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Predictive ranking of real US penny stocks (NASDAQ / NYSE / NYSE
            American) — learned from 3 years of daily history and the macro
            regimes they thrive in.
          </p>
        </div>
        <ModelChip model={model} apiOffline={apiOffline} />
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={handleRun}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Running analysis…
            </>
          ) : (
            <>▶ Run Daily Analysis</>
          )}
        </button>

        <button
          onClick={handleNewsScan}
          disabled={running || newsScanning}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {newsScanning ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Scanning news…
            </>
          ) : (
            <>⚡ News Surge Scan</>
          )}
        </button>

        <nav className="flex rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
          {(["today", "history"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-1.5 capitalize transition ${
                tab === key
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {key === "today" ? "Today’s picks" : "History"}
            </button>
          ))}
        </nav>

        {running && (
          <span className="text-xs text-slate-500">
            Refreshing data → scoring universe → storing top 5. Model retrains
            automatically if stale.
          </span>
        )}
        {newsScanning && (
          <span className="text-xs text-slate-500">
            Scoring universe → fetching fresh headlines → ranking catalysts
            (typically ~20–40s).
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {newsError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          News scan failed: {newsError}
        </div>
      )}

      {runResult && !error && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Analysis complete for <strong>{fmtDate(runResult.date)}</strong> —{" "}
          {runResult.scored} candidates scored (universe {runResult.universe}),
          {runResult.model_retrained ? " model retrained," : ""}
          {runResult.refresh?.market
            ? ` live refresh: ${runResult.refresh.market.updated}/${runResult.refresh.market.attempted} symbols,`
            : ""}{" "}
          finished in {runResult.took_seconds}s.
        </div>
      )}

      {!runResult && notice && !error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {notice}
        </div>
      )}

      <section className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-16 text-center text-slate-500">
            Loading…
          </div>
        ) : tab === "today" ? (
          today && today.items.length > 0 ? (
            <>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Top 5 for {fmtDate(today.date)}
                </h2>
                <span className="font-mono text-xs text-slate-500">
                  {today.model_version}
                </span>
              </div>
              <TodayTable items={today.items} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-16 text-center text-slate-500">
              No recommendations yet — hit{" "}
              <span className="font-semibold text-emerald-600">
                Run Daily Analysis
              </span>{" "}
              to generate today’s top 5.
            </div>
          )
        ) : history ? (
          <HistoryList history={history} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-16 text-center text-slate-500">
            History unavailable.
          </div>
        )}
      </section>

      {newsScan && (
        <section ref={newsSectionRef} className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                News surge — top jump candidates
              </h2>
              <p className="text-xs text-slate-500">
                {newsScan.candidates_scanned} model-top candidates ·{" "}
                {newsScan.with_fresh_news} with fresh news (last{" "}
                {newsScan.lookback_days}d) · target horizon ~
                {newsScan.horizon_days} days · scan took{" "}
                {newsScan.took_seconds}s
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {newsScan.date}
            </span>
          </div>

          {newsScan.items.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {newsScan.items.map((item) => (
                <NewsCard key={item.ticker} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center text-slate-500">
              No fresh catalyst headlines in the window — rerun the scan
              later.
            </div>
          )}
        </section>
      )}

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500">
        <p>
          IstikStocks is a research prototype. Model scores are estimates of
          forward returns derived from historical pattern learning — not
          financial advice. Penny stocks are highly volatile and illiquid.
        </p>
      </footer>
    </main>
  );
}
