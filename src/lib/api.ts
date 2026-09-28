import type {
  HistoryResponse,
  ModelStatusResponse,
  NewsScanResponse,
  RunAnalysisResponse,
  TodayResponse,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as T & { error?: string };

  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }

  return body;
}

export function fetchToday(): Promise<TodayResponse> {
  return request<TodayResponse>("/api/recommendations/today");
}

export function fetchHistory(days = 30): Promise<HistoryResponse> {
  return request<HistoryResponse>(`/api/recommendations/history?days=${days}`);
}

export function fetchModelStatus(): Promise<ModelStatusResponse> {
  return request<ModelStatusResponse>("/api/model/status");
}

export function runAnalysis(): Promise<RunAnalysisResponse> {
  return request<RunAnalysisResponse>("/api/run-analysis", {
    method: "POST",
    body: JSON.stringify({ refresh: true }),
  });
}

export function runNewsScan(): Promise<NewsScanResponse> {
  return request<NewsScanResponse>("/api/news-scan", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
