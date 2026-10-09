import { readToken } from "./session";
import type {
  AccessResponse,
  AdminStats,
  AdminUser,
  AuthResponse,
  AuthUser,
  FeatureKey,
  HistoryResponse,
  ModelStatusResponse,
  NewsScanResponse,
  Paginated,
  RunAnalysisResponse,
  StockEvaluationResponse,
  StockSearchResult,
  WatchlistDetailResponse,
  WatchlistResponse,
  WatchlistsResponse,
  SubscriptionsResponse,
  Subscription,
  TodayResponse,
  BillingPeriod,
  BillingState,
  CheckoutResponse,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly upgradeRequired: boolean;
  readonly feature: FeatureKey | null;

  constructor(
    message: string,
    status: number,
    upgradeRequired = false,
    feature: FeatureKey | null = null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.upgradeRequired = upgradeRequired;
    this.feature = feature;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = readToken();

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as T &
    ApiErrorLike & { errors?: Record<string, string[]> };

  if (!res.ok) {
    const fieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    throw new ApiError(
      fieldError ?? body?.error ?? body?.message ?? `Request failed (${res.status})`,
      res.status,
      Boolean(body?.upgrade_required),
      (body?.feature as FeatureKey) ?? null
    );
  }

  return body;
}

interface ApiErrorLike {
  error?: string;
  message?: string;
  upgrade_required?: boolean;
  feature?: string;
}

/* ------------------------------ stock data ------------------------------ */

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

/* --------------------------- stock lookup --------------------------- */

export function searchStocks(q: string): Promise<{ results: StockSearchResult[] }> {
  const params = new URLSearchParams({ q });
  return request(`/api/stocks/search?${params.toString()}`);
}

export function evaluateStock(
  ticker: string
): Promise<StockEvaluationResponse> {
  return request(`/api/stocks/${encodeURIComponent(ticker)}/evaluation`);
}

/* ------------------------------ watchlists ------------------------------ */

export function fetchWatchlists(): Promise<WatchlistsResponse> {
  return request<WatchlistsResponse>("/api/watchlists");
}

export function createWatchlist(name: string): Promise<WatchlistResponse> {
  return request<WatchlistResponse>("/api/watchlists", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function renameWatchlist(
  id: number,
  name: string
): Promise<WatchlistResponse> {
  return request<WatchlistResponse>(`/api/watchlists/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteWatchlist(id: number): Promise<{ message: string }> {
  return request(`/api/watchlists/${id}`, { method: "DELETE" });
}

export function fetchWatchlist(id: number): Promise<WatchlistDetailResponse> {
  return request<WatchlistDetailResponse>(`/api/watchlists/${id}`);
}

export function addWatchlistItem(
  id: number,
  ticker: string
): Promise<{ item: { id: number; ticker: string } }> {
  return request(`/api/watchlists/${id}/items`, {
    method: "POST",
    body: JSON.stringify({ ticker }),
  });
}

export function removeWatchlistItem(
  id: number,
  itemId: number
): Promise<{ message: string }> {
  return request(`/api/watchlists/${id}/items/${itemId}`, { method: "DELETE" });
}

/* ------------------------- accounts & access ------------------------- */

export function fetchAccess(): Promise<AccessResponse> {
  return request<AccessResponse>("/api/access");
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });
}

export function logout(): Promise<{ success: boolean; message: string }> {
  return request("/api/auth/logout", { method: "POST" });
}

export function fetchMe(): Promise<AccessResponse> {
  return request<AccessResponse>("/api/auth/me");
}

export function fetchPlans(): Promise<SubscriptionsResponse> {
  return request<SubscriptionsResponse>("/api/admin/subscriptions");
}

/* ------------------------- administration ------------------------- */

export function fetchAdminStats(): Promise<{ success: boolean; data: AdminStats }> {
  return request("/api/admin/stats");
}

export interface AdminUserQuery {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export function fetchAdminUsers(
  query: AdminUserQuery = {}
): Promise<Paginated<AdminUser>> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.role) params.set("role", query.role);
  if (query.is_active !== undefined) params.set("is_active", String(query.is_active));
  if (query.page) params.set("page", String(query.page));
  params.set("per_page", String(query.per_page ?? 50));

  return request<Paginated<AdminUser>>(`/api/admin/users?${params.toString()}`);
}

export interface AdminUserPayload {
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  subscription_id: number | null;
  is_active: boolean;
  subscription_expires_at?: string | null;
}

export function createAdminUser(payload: AdminUserPayload): Promise<{ data: AdminUser }> {
  return request("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminUser(
  id: number,
  payload: Partial<AdminUserPayload>
): Promise<{ data: AdminUser }> {
  return request(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminUser(id: number): Promise<{ message: string }> {
  return request(`/api/admin/users/${id}`, { method: "DELETE" });
}

export function resetAdminUserPassword(
  id: number,
  password: string
): Promise<{ message: string }> {
  return request(`/api/admin/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export interface AdminSubscriptionPayload {
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  annual_price: number | null;
  billing_period: string;
  features: FeatureKey[];
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

export function createAdminSubscription(
  payload: AdminSubscriptionPayload
): Promise<{ data: Subscription }> {
  return request("/api/admin/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminSubscription(
  id: number,
  payload: Partial<AdminSubscriptionPayload>
): Promise<{ data: Subscription }> {
  return request(`/api/admin/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminSubscription(id: number): Promise<{ message: string }> {
  return request(`/api/admin/subscriptions/${id}`, { method: "DELETE" });
}

/* -------------------------------- billing -------------------------------- */

export function fetchBillingState(): Promise<BillingState> {
  return request("/api/billing/subscription");
}

export function fetchQuote(
  subscriptionId: number,
  billingPeriod: BillingPeriod,
  autoRenew: boolean
): Promise<CheckoutResponse> {
  const qs = new URLSearchParams({
    subscription_id: String(subscriptionId),
    billing_period: billingPeriod,
    auto_renew: String(autoRenew),
  });

  return request(`/api/billing/quote?${qs.toString()}`);
}

export function createCheckout(payload: {
  subscription_id: number;
  billing_period: BillingPeriod;
  auto_renew: boolean;
}): Promise<CheckoutResponse> {
  return request("/api/billing/checkouts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchCheckout(id: number): Promise<CheckoutResponse> {
  return request(`/api/billing/checkouts/${id}`);
}

export function confirmCheckout(id: number): Promise<CheckoutResponse> {
  return request(`/api/billing/checkouts/${id}/confirm`, { method: "POST" });
}

export function cancelCheckout(id: number): Promise<{ checkout: CheckoutResponse["checkout"] }> {
  return request(`/api/billing/checkouts/${id}/cancel`, { method: "POST" });
}

export type { AuthUser, Subscription };
