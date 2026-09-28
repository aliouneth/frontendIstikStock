export interface ModelInfo {
  trained: boolean;
  version?: string | null;
  trained_at?: string | null;
  metrics?: {
    holdout?: Record<string, number>;
    train?: Record<string, number>;
  } | null;
  dataset?: Record<string, unknown> | null;
  top_features?: Record<string, number>;
}

export interface Performance {
  current_price: number | null;
  last_pct: number | null;
  last_benchmark_pct: number | null;
  best_pct: number | null;
  days_tracked: number;
  series: {
    date: string;
    close: number;
    pct: number | null;
    benchmark_pct: number | null;
  }[];
}

export interface Recommendation {
  rank: number;
  ticker: string;
  name: string | null;
  sector: string | null;
  price_at_recommendation: number;
  score: number;
  rationale: string;
  key_features: Record<string, number>;
  performance: Performance;
}

export interface TodayResponse {
  success: boolean;
  date: string;
  model_version: string;
  model: ModelInfo;
  items: Recommendation[];
  error?: string;
}

export interface HistoryDay {
  date: string;
  picks: number;
  avg_return_pct: number | null;
  avg_benchmark_pct: number | null;
  items: Recommendation[];
}

export interface Evaluation {
  recommendations_evaluated?: number;
  tracked_rows?: number;
  avg_pick_return_pct?: number;
  avg_benchmark_return_pct?: number;
  avg_excess_pct?: number;
  hit_rate_pct?: number;
  message?: string;
}

export interface HistoryResponse {
  success: boolean;
  days: number;
  history: HistoryDay[];
  evaluation: Evaluation;
}

export interface RunPick {
  rank: number;
  ticker: string;
  name: string | null;
  sector: string | null;
  price: number;
  score: number;
  rationale: string;
  key_features: Record<string, number>;
}

export interface NewsHeadline {
  title: string;
  publisher: string;
  url: string;
  age_hours: number;
  signal: "best" | "positive" | "negative" | "neutral";
}

export interface NewsScanItem {
  rank: number;
  ticker: string;
  name: string | null;
  sector: string | null;
  price: number;
  surge_score: number;
  model_score: number;
  news_score: number;
  target_price: number;
  target_pct: number;
  horizon_days: number;
  reasoning: string;
  key_features: Record<string, number>;
  headlines: NewsHeadline[];
}

export interface NewsScanResponse {
  success: boolean;
  generated_at: string;
  date: string;
  lookback_days: number;
  horizon_days: number;
  candidates_scanned: number;
  with_fresh_news: number;
  took_seconds: number;
  items: NewsScanItem[];
  error?: string;
}

export interface RunAnalysisResponse {
  success: boolean;
  date: string;
  model_version: string;
  model_retrained: boolean;
  universe: number;
  scored: number;
  skipped: number;
  took_seconds: number;
  refresh?: {
    market?: { attempted: number; updated: number; failed: string[] };
    macro?: Record<string, unknown>;
  };
  recommendations: RunPick[];
  error?: string;
}

export interface ModelStatusResponse {
  success: boolean;
  model: ModelInfo;
}
