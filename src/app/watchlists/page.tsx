"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SiteLogo from "@/components/SiteLogo";
import AccountBar from "@/components/AccountBar";
import { LockedPanel } from "@/components/Locked";
import { useAuth } from "@/components/AuthProvider";
import {
  ApiError,
  addWatchlistItem,
  createWatchlist,
  deleteWatchlist,
  fetchWatchlist,
  fetchWatchlists,
  removeWatchlistItem,
  renameWatchlist,
  searchStocks,
} from "@/lib/api";
import type {
  StockSearchResult,
  WatchlistItem,
  WatchlistSummary,
} from "@/lib/types";

function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  })}`;
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

/** Trailing return over the last `days` closes, as a percentage. */
function trailingReturn(points: { close: number }[], days: number): number | null {
  if (points.length < days + 1) return null;
  const from = points[points.length - 1 - days].close;
  const to = points[points.length - 1].close;
  if (!from) return null;
  return (100 * (to - from)) / from;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const W = 120;
  const H = 32;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - 4 - ((v - min) / range) * (H - 8);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = points[points.length - 1] >= points[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-8 w-28">
      <path
        d={path}
        fill="none"
        stroke={up ? "#10b981" : "#f43f5e"}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ItemRow({
  item,
  onRemove,
  removing,
}: {
  item: WatchlistItem;
  onRemove: (item: WatchlistItem) => void;
  removing: boolean;
}) {
  const closes = useMemo(
    () => item.price_history.map((p) => p.close),
    [item.price_history]
  );
  const r1 = trailingReturn(item.price_history, 1);
  const r5 = trailingReturn(item.price_history, 5);
  const r20 = trailingReturn(item.price_history, 20);
  const ev = item.evaluation;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/stock?t=${encodeURIComponent(item.ticker)}`}
              className="font-mono text-sm font-bold text-slate-900 hover:text-sky-700 hover:underline"
            >
              {item.ticker}
            </Link>
            <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {item.exchange ?? "—"}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {item.name ?? "—"}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {item.sector ?? "Unclassified"}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-sm font-semibold tabular-nums text-slate-900">
              {fmtPrice(ev && "item" in ev ? ev.item.price : item.last_price)}
            </div>
            <div className="mt-1 flex items-center justify-end gap-2 text-[11px] tabular-nums">
              <span className={r1 === null ? "text-slate-400" : r1 >= 0 ? "text-emerald-600" : "text-rose-600"}>
                1d {fmtPct(r1)}
              </span>
              <span className={r5 === null ? "text-slate-400" : r5 >= 0 ? "text-emerald-600" : "text-rose-600"}>
                5d {fmtPct(r5)}
              </span>
              <span className={r20 === null ? "text-slate-400" : r20 >= 0 ? "text-emerald-600" : "text-rose-600"}>
                20d {fmtPct(r20)}
              </span>
            </div>
          </div>

          <Sparkline points={closes} />

          <div className="w-24 text-right">
            {ev && ev.eligible ? (
              <>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Rank
                </div>
                <div className="font-mono text-sm font-bold text-emerald-700">
                  #{ev.rank}
                  <span className="text-[10px] font-normal text-emerald-600">
                    /{ev.peers}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  score {ev.item.score.toFixed(0)}
                </div>
              </>
            ) : (
              <div className="text-[10px] leading-tight text-amber-700">
                not scorable
              </div>
            )}
          </div>

          <button
            onClick={() => onRemove(item)}
            disabled={removing}
            title={`Remove ${item.ticker} from this list`}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      </div>

      {ev && !ev.eligible && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
          {ev.reason}
        </p>
      )}
      {ev && ev.eligible && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
          {ev.item.rationale}
        </p>
      )}
    </li>
  );
}

export default function WatchlistsPage() {
  const { can, ready } = useAuth();
  const allow = can("watchlists");

  const [lists, setLists] = useState<WatchlistSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => lists.find((l) => l.id === activeId) ?? null,
    [lists, activeId]
  );

  const loadLists = useCallback(async (): Promise<void> => {
    const res = await fetchWatchlists();
    setLists(res.watchlists);
    setActiveId((current) => {
      if (current !== null && res.watchlists.some((l) => l.id === current)) {
        return current;
      }
      return res.watchlists[0]?.id ?? null;
    });
  }, []);

  const loadDetail = useCallback(async (id: number): Promise<void> => {
    setLoadingDetail(true);
    try {
      const res = await fetchWatchlist(id);
      setItems(res.items);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!allow) return;
    loadLists().catch((e: Error) => setError(e.message));
  }, [allow, loadLists]);

  useEffect(() => {
    if (activeId === null) {
      setItems([]);
      return;
    }
    loadDetail(activeId).catch((e: Error) => setError(e.message));
  }, [activeId, loadDetail]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!allow || activeId === null || q.length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await searchStocks(q);
        if (q === query.trim()) {
          setResults(res.results);
          setOpen(true);
        }
      } catch {
        setResults([]);
        setOpen(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, allow, activeId]);

  function describe(e: unknown): string {
    return e instanceof ApiError
      ? e.message
      : e instanceof Error
        ? e.message
        : "Something went wrong.";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createWatchlist(name);
      setNewName("");
      await loadLists();
      setActiveId(res.watchlist.id);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(name: string) {
    if (!active || name === active.name || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await renameWatchlist(active.id, name.trim());
      await loadLists();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!active) return;
    const name = active.name;
    if (!confirm(`Delete the list "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteWatchlist(active.id);
      setActiveId(null);
      await loadLists();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(ticker: string) {
    if (activeId === null) return;
    setBusy(true);
    setError(null);
    setQuery("");
    setOpen(false);
    try {
      await addWatchlistItem(activeId, ticker);
      await loadLists();
      await loadDetail(activeId);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(item: WatchlistItem) {
    if (activeId === null) return;
    setBusy(true);
    setError(null);
    try {
      await removeWatchlistItem(activeId, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setLists((prev) =>
        prev.map((l) =>
          l.id === activeId
            ? { ...l, items_count: Math.max(0, l.items_count - 1) }
            : l
        )
      );
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <SiteLogo size="lg" priority />
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Track stocks you care about across named lists. Each entry follows the
          price over time alongside the model&apos;s current score and rank.
        </p>
      </div>
      <AccountBar />
    </header>
  );

  if (!ready) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {header}
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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {header}
        <nav className="mt-6 text-sm text-slate-500">
          <Link href="/" className="text-sky-700 hover:underline">
            ← Back to dashboard
          </Link>
        </nav>
        <section className="mt-6">
          <LockedPanel
            feature="watchlists"
            message="Stock watchlists are available to Premium subscribers. Ask an administrator to upgrade your subscription to unlock them."
          />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {header}

      <nav className="mt-6 text-sm text-slate-500">
        <Link href="/" className="text-sky-700 hover:underline">
          ← Back to dashboard
        </Link>
      </nav>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list name"
              maxLength={60}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <button
              type="submit"
              disabled={busy || newName.trim().length === 0}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              Add
            </button>
          </form>

          <ul className="mt-4 space-y-1">
            {lists.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-500">
                No lists yet. Create one above to start tracking.
              </li>
            )}
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => setActiveId(l.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    l.id === activeId
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="truncate">{l.name}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 text-[10px] ${
                      l.id === activeId
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {l.items_count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section>
          {!active ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-16 text-center text-sm text-slate-500">
              Create a list, then add tickers to follow them over time.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  key={active.id}
                  defaultValue={active.name}
                  onBlur={(e) => handleRename(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  maxLength={60}
                  aria-label="List name"
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-bold text-slate-900 outline-none transition hover:border-slate-200 focus:border-sky-400"
                />
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                >
                  Delete list
                </button>
              </div>

              <div ref={searchRef} className="relative mt-4">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setOpen(true)}
                  placeholder="Add a ticker, e.g. CAN or ATA Creativity"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                {open && results.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {results.map((r) => (
                      <button
                        key={r.ticker}
                        onClick={() => handleAdd(r.ticker)}
                        disabled={busy}
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left transition last:border-0 hover:bg-sky-50 disabled:opacity-50"
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
              </div>

              <div className="mt-4">
                {loadingDetail ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center text-sm text-slate-500">
                    Loading tracked stocks…
                  </div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center text-sm text-slate-500">
                    This list is empty. Search above to add the first ticker.
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onRemove={handleRemove}
                        removing={busy}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>

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
