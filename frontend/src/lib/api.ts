export const useApi = import.meta.env.VITE_USE_API === "true";
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3002/api/v1";
const envApiToken = import.meta.env.VITE_API_TOKEN as string | undefined;
const ACCESS_TOKEN_KEY = "neondsa_access_token";
const REFRESH_TOKEN_KEY = "neondsa_refresh_token";
const USER_PROFILE_KEY = "neondsa_user_profile";

export type CachedUserProfile = {
  username: string;
  email?: string;
};
let refreshPromise: Promise<string | null> | null = null;

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export type ApiProblem = {
  _id: string;
  slug: string;
  title: string;
  level: 1 | 2 | 3 | 4 | 5;
  category: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starter: { java: string; python: string };
  /** Present only when the caller is an admin. */
  solution?: { java: string; python: string };
};

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getApiToken(): string | undefined {
  const storage = getStorage();
  const stored = storage?.getItem(ACCESS_TOKEN_KEY) ?? undefined;
  return stored || envApiToken;
}

export function setAuthTokens(tokens: AuthTokens) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function getRefreshToken(): string | undefined {
  const storage = getStorage();
  return storage?.getItem(REFRESH_TOKEN_KEY) ?? undefined;
}

export function clearAuthTokens() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_PROFILE_KEY);
}

export function setCachedUserProfile(profile: CachedUserProfile | null) {
  const storage = getStorage();
  if (!storage) return;
  if (!profile) {
    storage.removeItem(USER_PROFILE_KEY);
    return;
  }
  storage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export function getCachedUserProfile(): CachedUserProfile | null {
  const storage = getStorage();
  const raw = storage?.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as CachedUserProfile;
    if (p && typeof p.username === "string") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function isAuthenticated() {
  return Boolean(getApiToken());
}

/** Decode JWT payload (no signature verification — UI only; API still enforces roles). */
function decodeJwtPayload(token: string): { role?: string; userId?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    return JSON.parse(atob(base64)) as { role?: string; userId?: string };
  } catch {
    return null;
  }
}

/** Stable user id from access token (for fallback labeling when profile cache is empty). */
export function getJwtUserId(): string | null {
  const token = getApiToken();
  if (!token) return null;
  const id = decodeJwtPayload(token)?.userId;
  return typeof id === "string" ? id : null;
}

/** Role from the current access token (RoyalDSA JWT includes `role`). */
export function getUserRole(): "user" | "admin" | null {
  const token = getApiToken();
  if (!token) return null;
  const role = decodeJwtPayload(token)?.role;
  if (role === "admin" || role === "user") return role;
  return null;
}

export function userIsAdmin(): boolean {
  return getUserRole() === "admin";
}

function authHeaders() {
  const token = getApiToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;
      const json = await response.json();
      const data = json.data as { accessToken: string; refreshToken?: string };
      if (!data?.accessToken) return null;
      setAuthTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? refreshToken,
      });
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

type ApiEnvelope<T> = { ok?: boolean; data?: T; error?: { code?: string; message?: string } };

async function parseApiResponse<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return {};
  }
}

async function requestWithAuthRetry(path: string, init?: RequestInit): Promise<Response> {
  let response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...authHeaders(),
    },
  });

  if (response.status !== 401 || path === "/auth/refresh") {
    return response;
  }

  const newToken = await tryRefreshAccessToken();
  if (!newToken) {
    clearAuthTokens();
    return response;
  }

  response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...authHeaders(),
    },
  });

  if (response.status === 401) {
    clearAuthTokens();
  }

  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await requestWithAuthRetry(path, {
    method: "GET",
  });
  const json = await parseApiResponse<T>(res);
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json.data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await requestWithAuthRetry(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await parseApiResponse<T>(res);
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json.data as T;
}

/**
 * Best-effort POST for page lifecycle (pagehide / unload). Uses keepalive; no token refresh.
 * Use when the page may be destroyed before a normal fetch completes.
 */
export function apiPostKeepalive(path: string, body: unknown): void {
  const token = getApiToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  void fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    keepalive: true,
  });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await requestWithAuthRetry(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await parseApiResponse<T>(res);
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json.data as T;
}

/** Fetch `/auth/me` and cache username/email for the NavBar (OAuth / restored sessions). */
export async function refreshCachedUserProfile(): Promise<CachedUserProfile | null> {
  if (!useApi || !getApiToken()) return null;
  try {
    const me = await apiGet<{ username: string; email?: string }>("/auth/me");
    const profile: CachedUserProfile = { username: me.username, email: me.email };
    setCachedUserProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

