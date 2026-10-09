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
  rationale_locked?: boolean;
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

export type FeatureKey =
  | "daily_analysis"
  | "news_surge"
  | "today_picks"
  | "history"
  | "history_graphs"
  | "model_metrics"
  | "full_rationale"
  | "stock_lookup"
  | "watchlists";

export interface WatchlistSummary {
  id: number;
  name: string;
  items_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface WatchlistItem {
  id: number;
  ticker: string;
  name: string | null;
  sector: string | null;
  exchange: string | null;
  last_price: number | null;
  evaluation: (StockEvaluation & { price_history?: StockPricePoint[] }) | null;
  price_history: StockPricePoint[];
}

export interface WatchlistDetail extends WatchlistSummary {
  items: WatchlistItem[];
}

export interface WatchlistsResponse {
  watchlists: WatchlistSummary[];
}

export interface WatchlistResponse {
  watchlist: WatchlistSummary;
}

export interface WatchlistDetailResponse {
  watchlist: WatchlistSummary;
  items: WatchlistItem[];
}

export interface StockSearchResult {
  ticker: string;
  name: string | null;
  sector: string | null;
  exchange: string | null;
  last_price: number | null;
}

export interface StockPricePoint {
  date: string;
  close: number;
  volume: number;
}

export interface StockEvaluationBase {
  date: string;
  model_version: string;
  universe: number;
  scored: number;
  skipped: number;
  ticker: string;
  name: string | null;
  sector: string;
  exchange: string | null;
  market_cap: number | null;
}

export interface StockEvaluationEligible extends StockEvaluationBase {
  eligible: true;
  rank: number;
  percentile: number;
  peers: number;
  item: {
    rank: number;
    stock_id: number;
    ticker: string;
    name: string | null;
    sector: string | null;
    price: number;
    score: number;
    raw: number;
    rationale: string;
    key_features: Record<string, number>;
  };
}

export interface StockEvaluationIneligible extends StockEvaluationBase {
  eligible: false;
  reason: string;
}

export type StockEvaluation = StockEvaluationEligible | StockEvaluationIneligible;

export interface StockEvaluationResponse {
  evaluation: StockEvaluation & { price_history: StockPricePoint[] };
}

export type BillingPeriod = "monthly" | "annual";

export interface Subscription {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  annual_price: number | null;
  annual_price_effective: number;
  annual_savings: number;
  currency: string;
  billing_period: string;
  features: FeatureKey[];
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  users_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Checkout {
  id: number;
  plan_id: number;
  plan_name: string;
  billing_period: BillingPeriod;
  is_annual: boolean;
  auto_renew: boolean;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  driver: string;
  paid_at: string | null;
  period_ends_at: string | null;
  failure_reason: string | null;
  created_at: string | null;
}

export interface PaymentIntent {
  mode: string;
  collects_payment: boolean;
  label?: string;
  message?: string;
}

export interface Quote {
  billing_period: BillingPeriod;
  is_annual: boolean;
  auto_renew: boolean;
  amount: number;
  currency: string;
  savings: number;
  renews_at: string | null;
  line_items: { label: string; amount: number }[];
}

export interface BillingState {
  subscription: Subscription | null;
  auto_renew: boolean;
  expires_at: string | null;
  is_expired: boolean;
  payment_collected: boolean;
  recent_checkouts: Checkout[];
}

export interface CheckoutResponse {
  checkout: Checkout;
  payment: PaymentIntent | null;
  quote?: Quote;
  plan?: Subscription;
  user?: AuthUser;
  message?: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
  subscription_id: number | null;
  subscription: Subscription | null;
  subscription_expires_at: string | null;
  auto_renew: boolean;
  features: FeatureKey[];
  is_admin: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

export interface AccessResponse {
  success: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  features: FeatureKey[];
  available_features: Record<string, string>;
  locked_features?: FeatureKey[];
  plans: Subscription[];
}

export interface AuthResponse extends AccessResponse {
  token: string;
  message: string;
}

export interface AdminUser extends AuthUser {
  updated_at?: string | null;
}

export interface Paginated<T> {
  success: boolean;
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface SubscriptionsResponse {
  success: boolean;
  data: Subscription[];
  available_features: Record<string, string>;
}

export interface AdminPlanStat {
  id: number;
  name: string;
  slug: string;
  price: number;
  users: number;
}

export interface AdminStats {
  generated_at: string;
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    new_today: number;
    new_7d: number;
    new_30d: number;
    seen_7d: number;
    never_signed_in: number;
  };
  plans: AdminPlanStat[];
  unassigned_plan: number;
  watchlists: {
    lists: number;
    items: number;
    users: number;
  };
  billing: {
    paid: number;
    pending: number;
    failed: number;
    revenue: number;
  };
  content: {
    stocks: number;
    recommendations: number;
    latest_recommendation_date: string | null;
    model_runs: number;
    last_model_run: {
      run_type: string;
      status: string;
      started_at: string | null;
      finished_at: string | null;
    } | null;
  };
}

export interface ApiErrorShape {
  error?: string;
  message?: string;
  upgrade_required?: boolean;
  feature?: string;
  errors?: Record<string, string[]>;
}

export type FeatureMap = Record<FeatureKey, string>;
