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
export async function analyzeMealViaServer(imageBase64, mimeType = 'image/jpeg', textQuery = '') {
  const body = {};
  if (imageBase64) {
    body.imageBase64 = imageBase64;
    body.mimeType = mimeType;
  }
  if (textQuery) {
    body.textQuery = textQuery;
  }

  const res = await fetch(`${BASE}/api/analyze/meal`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    clearAuthToken();
    throw new Error('Session expired — please re-enter your PIN.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Analysis failed');
  return data;
}

// ── Meals ─────────────────────────────────────────────────────
export async function fetchMeals(date) {
  const res = await fetch(`${BASE}/api/meals?date=${date}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch meals');
  return res.json();
}

export async function fetchMealsRange(from, to) {
  const res = await fetch(`${BASE}/api/meals/range?from=${from}&to=${to}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch meals range');
  return res.json();
}

export async function saveMeal(meal) {
  const res = await fetch(`${BASE}/api/meals`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(meal),
  });
  if (!res.ok) throw new Error('Failed to save meal');
  return res.json();
}

export async function deleteMeal(id) {
  await fetch(`${BASE}/api/meals/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function updateMeal(id, meal) {
  const res = await fetch(`${BASE}/api/meals/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(meal),
  });
  if (!res.ok) throw new Error('Failed to update meal');
  return res.json();
}

// ── Favorites ──────────────────────────────────────────────────
export async function fetchFavorites() {
  const res = await fetch(`${BASE}/api/favorites`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
}

export async function saveFavorite(favorite) {
  const res = await fetch(`${BASE}/api/favorites`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(favorite),
  });
  if (!res.ok) throw new Error('Failed to save favorite');
  return res.json();
}

export async function updateFavorite(id, favorite) {
  const res = await fetch(`${BASE}/api/favorites/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(favorite),
  });
  if (!res.ok) throw new Error('Failed to update favorite');
  return res.json();
}

export async function deleteFavorite(id) {
  const res = await fetch(`${BASE}/api/favorites/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to delete favorite');
  return res.json();
}

// ── Weight Logs ───────────────────────────────────────────────
export async function fetchWeightLogs() {
  const res = await fetch(`${BASE}/api/weight-logs`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch weight logs');
  return res.json();
}

export async function saveWeightLogApi(date, weight) {
  const res = await fetch(`${BASE}/api/weight-logs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ date, weight }),
  });
  if (!res.ok) throw new Error('Failed to save weight log');
  return res.json();
}

export async function deleteWeightLogApi(id) {
  await fetch(`${BASE}/api/weight-logs/${id}`, { method: 'DELETE', headers: authHeaders() });
}

// ── Profile ───────────────────────────────────────────────────
export async function fetchProfile() {
  const res = await fetch(`${BASE}/api/profile`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function saveProfileApi(profile) {
  const res = await fetch(`${BASE}/api/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('Failed to save profile');
  return res.json();
}

// ── Meal Suggestion ────────────────────────────────────────────
export async function fetchMealSuggestion({ todayMeals, historyMeals, userProfile, currentTime }) {
  const res = await fetch(`${BASE}/api/suggest/meal`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ todayMeals, historyMeals, userProfile, currentTime }),
  });
  if (res.status === 401) {
    clearAuthToken();
    throw new Error('Session expired — please re-enter your PIN.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get meal suggestion');
  return data;
}
