// All API calls go through here — they hit our backend server, never Gemini directly
// Empty string = relative URLs. Vite proxies /api/* → localhost:3001 in dev.
// In production the Express server serves the frontend too, so relative URLs work.
const BASE = '';

const AUTH_TOKEN_KEY = 'fitai_auth_token';

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getAuthToken();
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-auth-token': getAuthToken(),
  };
}

// ── Auth ─────────────────────────────────────────────────────
export async function verifyPin(pin) {
  const res = await fetch(`${BASE}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Incorrect PIN');
  setAuthToken(data.token);
  return data.token;
}

// ── Meal Analysis ─────────────────────────────────────────────
export async function analyzeMealViaServer(imageBase64, mimeType = 'image/jpeg') {
  const res = await fetch(`${BASE}/api/analyze/meal`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (res.status === 401) {
    clearAuthToken();
    throw new Error('Session expired — please re-enter your PIN.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Analysis failed');
  return data;
}
