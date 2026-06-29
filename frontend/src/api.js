// API client for the Review Atlas backend.
// Dev (Vite proxy) and prod (nginx) both map "/api/*" to the backend.

const TOKEN_KEY = 'review-atlas-token';
const BASE = '/api';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class AuthError extends Error {}

// Every request is bounded by a client-side timeout (via AbortController) so a slow
// or hung backend surfaces a clear error instead of an endless spinner.
async function req(path, { timeoutMs = 25000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'X-Access-Token': getToken() },
      signal: ctrl.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The analysis took too long and timed out. Please try again.');
    }
    throw new Error('Network error — could not reach the API.');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) {
    clearToken();
    throw new AuthError('Unauthorized');
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail || detail;
    } catch {
      /* non-JSON body */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const verifyToken = () => req('/auth/verify');

// Analysis runs the LLM pipeline (collect → classify → synthesize), so it gets a
// generous timeout; a healthy run completes in well under this.
export const analyze = (appId, region = 'europe', limit = 100) =>
  req(`/analyze?app_id=${encodeURIComponent(appId)}&region=${region}&limit=${limit}`, {
    timeoutMs: 90000,
  });

export const getReviews = (appId, region = 'europe') =>
  req(`/reviews?app_id=${encodeURIComponent(appId)}&region=${region}`);

export async function downloadReviews(appId, region, format) {
  const res = await fetch(
    `${BASE}/reviews/download?app_id=${appId}&region=${region}&format=${format}`,
    { headers: { 'X-Access-Token': getToken() } },
  );
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appId}_${region}_reviews.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Accept a numeric App Store id or a full App Store URL; return the id or null. */
export function parseAppId(input) {
  const fromUrl = String(input).match(/id(\d+)/);
  if (fromUrl) return fromUrl[1];
  const numeric = String(input).match(/(\d{5,})/);
  return numeric ? numeric[1] : null;
}
