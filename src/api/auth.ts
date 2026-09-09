import type { Role } from '../types';
import { apiUrl } from './config';

export interface AuthUserDto {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresInMs: number;
  user: AuthUserDto;
}

export interface OAuth2Provider {
  id: string;
  name: string;
  authorizationUrl: string;
}

interface ApiErrorBody {
  message?: string;
  error?: string;
  status?: number;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.message || body.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function customerLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl('/api/auth/custlogin'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<LoginResponse>;
}

/** Manager / admin only. Path spelling matches the API: contolledlogin */
export async function controlledLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl('/api/auth/contolledlogin'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<LoginResponse>;
}

export async function fetchOAuthProviders(): Promise<OAuth2Provider[]> {
  const res = await fetch(apiUrl('/api/auth/custlogin/oauth2'));
  if (!res.ok) return [];
  const body = (await res.json()) as { providers?: OAuth2Provider[] };
  return body.providers ?? [];
}

export async function fetchCurrentUser(token: string): Promise<AuthUserDto> {
  const res = await fetch(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<AuthUserDto>;
}

export function googleAuthorizeUrl(): string {
  return apiUrl('/api/auth/custlogin/oauth2/authorize/google');
}
