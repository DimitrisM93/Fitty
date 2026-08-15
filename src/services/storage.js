// Storage keys
export const STORAGE_KEYS = {
  GEMINI_API_KEY: 'fitai_gemini_key',
  GOOGLE_FIT_TOKEN: 'fitai_gfit_token',
  GOOGLE_FIT_TOKEN_EXPIRY: 'fitai_gfit_expiry',
  USER_PROFILE: 'fitai_user_profile',
  WEIGHT_LOGS: 'fitai_weight_logs',
};

export function getGeminiKey() {
  return localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
}

export function setGeminiKey(key) {
  localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key);
}

export function getUserProfile() {
  const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  const defaultProfile = { name: '', age: '', weight: '', height: '', gender: 'male', goal: 2000 };
  if (!raw) return defaultProfile;
  try { 
    const p = JSON.parse(raw); 
    if (!p.gender) p.gender = 'male';
    return p;
  } catch { return defaultProfile; }
}

export function setUserProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

export function getGoogleFitToken() {
  const token = localStorage.getItem(STORAGE_KEYS.GOOGLE_FIT_TOKEN);
  const expiry = localStorage.getItem(STORAGE_KEYS.GOOGLE_FIT_TOKEN_EXPIRY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry)) {
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_FIT_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_FIT_TOKEN_EXPIRY);
    return null;
  }
  return token;
}

export function setGoogleFitToken(token, expiresIn) {
  localStorage.setItem(STORAGE_KEYS.GOOGLE_FIT_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.GOOGLE_FIT_TOKEN_EXPIRY, String(Date.now() + expiresIn * 1000));
}

export function clearGoogleFitToken() {
  localStorage.removeItem(STORAGE_KEYS.GOOGLE_FIT_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.GOOGLE_FIT_TOKEN_EXPIRY);
}

// ─── Weight Logs ────────────────────────────────────────
export function getWeightLogs() {
  const raw = localStorage.getItem(STORAGE_KEYS.WEIGHT_LOGS);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function saveWeightLog(date, weight) {
  const logs = getWeightLogs();
  // Replace if same date exists, otherwise add
  const idx = logs.findIndex(l => l.date === date);
  if (idx >= 0) {
    logs[idx].weight = weight;
  } else {
    logs.push({ date, weight, id: Date.now() });
  }
  // Sort by date ascending
  logs.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(logs));
  return logs;
}

export function deleteWeightLog(id) {
  const logs = getWeightLogs().filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(logs));
  return logs;
}
