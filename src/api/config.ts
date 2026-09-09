const configured = import.meta.env.VITE_API_BASE_URL?.trim();

/** Backend origin (no trailing slash). Empty string uses Vite proxy in dev. */
export const API_BASE_URL = (configured || 'http://localhost:8080').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}
