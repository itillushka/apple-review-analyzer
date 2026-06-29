// API client for the Review Atlas backend.
// Dev (Vite proxy) and prod (nginx) both map "/api/*" to the backend.

const TOKEN_KEY = 'review-atlas-token';
const BASE = '/api';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class AuthError extends Error {}

async function req(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-Access-Token': getToken() } });
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

export const analyze = (appId, region = 'europe', limit = 100) =>
  req(`/analyze?app_id=${encodeURIComponent(appId)}&region=${region}&limit=${limit}`);

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
