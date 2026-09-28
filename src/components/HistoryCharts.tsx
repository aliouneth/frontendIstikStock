"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryDay } from "@/lib/types";

const COLORS = [
  "#10b981",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
  "#eab308",
  "#22c55e",
  "#f43f5e",
];

function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${m}/${d}`;
}

function PctTick({ value }: { value: number }) {
  return `${value}%`;
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

function PctTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-slate-700">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600">{entry.name}</span>
          <span className="ml-auto font-mono tabular-nums text-slate-900">
            {Number(entry.value) > 0 ? "+" : ""}
            {Number(entry.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

export default function HistoryCharts({ history }: { history: HistoryDay[] }) {
  const days = [...history].sort((a, b) => a.date.localeCompare(b.date));

  const daily = days
    .filter((d) => d.avg_return_pct !== null)
    .map((d) => ({
      date: fmtShort(d.date),
      label: d.date,
      picks: d.avg_return_pct ?? 0,
      bench: d.avg_benchmark_pct ?? 0,
    }));

  const tickers: string[] = [];
  const latestByTicker: Record<string, number> = {};
  const rowsByDate = new Map<
    string,
    { date: string; label: string; [key: string]: string | number }
  >();

  for (const day of days) {
    for (const item of day.items) {
      if (item.performance.series.length === 0) continue;
      if (!tickers.includes(item.ticker)) tickers.push(item.ticker);

      for (const pt of item.performance.series) {
        if (pt.pct === null) continue;
        // Series is ordered ascending — last write = current standing.
        latestByTicker[item.ticker] = pt.pct;
        let row = rowsByDate.get(pt.date);
        if (!row) {
          row = { date: pt.date, label: fmtShort(pt.date) };
          rowsByDate.set(pt.date, row);
        }
        row[item.ticker] = Math.round(pt.pct * 100) / 100;
      }
    }
  }

  // Only the 10 best current performers are drawn.
  const topTickers = tickers
    .filter((t) => t in latestByTicker)
    .sort((a, b) => latestByTicker[b] - latestByTicker[a])
    .slice(0, 10);

  const curves = [...rowsByDate.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );

  if (daily.length === 0 && curves.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center text-sm text-slate-500">
        No tracked performance yet — graphs appear after the first tracking
        update.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {daily.length > 0 && (
        <Card title="Average return by recommendation date — picks vs Russell 2000">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={52}
                />
                <Tooltip content={<PctTooltip />} cursor={{ fill: "#f1f5f9" }} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value: string) =>
                    value === "picks" ? "Top-5 picks" : "Benchmark (RUT)"
                  }
                />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar dataKey="picks" name="picks" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="bench" name="bench" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {curves.length > 0 && topTickers.length > 0 && (
        <Card title="Top 10 performers — return since recommendation (%)">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curves} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={52}
                />
                <Tooltip content={<PctTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string) => value}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                {topTickers.map((ticker, i) => (
                  <Line
                    key={ticker}
                    type="monotone"
                    dataKey={ticker}
                    name={ticker}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
