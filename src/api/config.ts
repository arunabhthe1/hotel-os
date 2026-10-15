const configured = import.meta.env.VITE_API_BASE_URL?.trim();

/**
 * Dev: API on :8080 unless VITE_API_BASE_URL is set.
 * Production (same Cloud Run origin): empty string so requests stay relative.
 */
export const API_BASE_URL = (
  configured
  || (import.meta.env.DEV ? 'http://localhost:8080' : '')
).replace(/\/$/, '');

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}
