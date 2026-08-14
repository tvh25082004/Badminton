'use client';

import { API_BASE } from './config';

export { API_BASE };

const ACCESS_KEY = 'bm_access';
const REFRESH_KEY = 'bm_refresh';

export function getTokens() {
  if (typeof window === 'undefined') return null;
  const access = window.localStorage.getItem(ACCESS_KEY);
  const refresh = window.localStorage.getItem(REFRESH_KEY);
  return access ? { access, refresh: refresh ?? '' } : null;
}

export function setTokens(access: string, refresh: string) {
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function refreshAccess(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens || !tokens.refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refresh }),
      cache: 'no-store',
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = options;

  const doFetch = async (token?: string): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

  let tokens = getTokens();
  let res = await doFetch(tokens?.access);

  // 401 → thử refresh một lần rồi retry
  if (res.status === 401 && tokens?.refresh) {
    const fresh = await refreshAccess();
    if (fresh) {
      res = await doFetch(fresh);
    }
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }

  if (!res.ok) {
    const err = data as { error?: { code?: string; message?: string; details?: unknown } };
    if (res.status === 401) clearTokens();
    throw new ApiError(
      res.status,
      err?.error?.code ?? 'HTTP_ERROR',
      err?.error?.message ?? `Request failed (${res.status})`,
      err?.error?.details,
    );
  }
  return data as T;
}

/** DTO nhỏ cho OTP — không cần token. */
export async function publicApi<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data as { error?: { code?: string; message?: string } };
    throw new ApiError(
      res.status,
      err?.error?.code ?? 'HTTP_ERROR',
      err?.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return data as T;
}
