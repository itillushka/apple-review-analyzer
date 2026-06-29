// API client for the Review Atlas backend. Both dev (Vite proxy) and prod (nginx)
// map "/api/*" to the backend, so the base path is always "/api".

const TOKEN_KEY = "review-atlas-token";
const BASE = "/api";

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? "";
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class AuthError extends Error {}

async function req<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Access-Token": getToken() },
  });
  if (res.status === 401) {
    clearToken();
    throw new AuthError("Unauthorized");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const verifyToken = () => req<{ ok: boolean }>("/auth/verify");

// --- types (mirror the backend pydantic models) ---

export interface ThemeStat {
  theme: string;
  count: number;
  share: number;
  examples: string[];
}

export interface Insights {
  backend: string;
  sentiment_distribution: Record<string, number>;
  sentiment_pct: Record<string, number>;
  emotion_distribution: Record<string, number>;
  taxonomy: Record<string, number>;
  mismatch_count: number;
  negative_themes: ThemeStat[];
  actionable: string[];
}

export interface RatingMetrics {
  total: number;
  average: number;
  distribution: Record<string, number>;
  distribution_pct: Record<string, number>;
  top_box_pct: number;
  bottom_box_pct: number;
  by_version: { version: string; count: number; average: number }[];
  trend: { month: string; count: number; average: number }[];
  by_country: Record<string, number>;
}

export interface AnalysisResult {
  app_id: string;
  region: string;
  collected: { returned: number; countries: string[]; warning: string | null };
  metrics: RatingMetrics;
  insights: Insights;
}

export const analyze = (appId: string, region = "europe", limit = 100) =>
  req<AnalysisResult>(
    `/analyze?app_id=${encodeURIComponent(appId)}&region=${region}&limit=${limit}`,
  );

export async function downloadReviews(
  appId: string,
  region: string,
  format: "json" | "csv",
) {
  const res = await fetch(
    `${BASE}/reviews/download?app_id=${appId}&region=${region}&format=${format}`,
    { headers: { "X-Access-Token": getToken() } },
  );
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${appId}_${region}_reviews.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Accept a numeric App Store id or a full App Store URL; return the id or null. */
export function parseAppId(input: string): string | null {
  const fromUrl = input.match(/id(\d+)/);
  if (fromUrl) return fromUrl[1];
  const numeric = input.match(/(\d{5,})/);
  return numeric ? numeric[1] : null;
}
