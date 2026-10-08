/**
 * Universal client-side API helper that ensures authentication is never lost
 * across page transitions, mobile browsers, or temporary network drops.
 */

export const AUTH_TOKEN_KEY = "jamnagar_auth_token";
export const AUTH_USER_KEY = "jamnagar_auth_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredSession(token: string, user: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  // Attach token headers if available
  if (token) {
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("x-session-token")) {
      headers.set("x-session-token", token);
    }
  }

  // Ensure credentials are always included so cookies are sent
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || "include",
  };

  return fetch(url, fetchOptions);
}
