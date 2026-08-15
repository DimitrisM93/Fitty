// Storage keys
export const STORAGE_KEYS = {
  GEMINI_API_KEY: 'fitai_gemini_key',
  GOOGLE_FIT_TOKEN: 'fitai_gfit_token',
  GOOGLE_FIT_TOKEN_EXPIRY: 'fitai_gfit_expiry',
  USER_PROFILE: 'fitai_user_profile',
};

export function getGeminiKey() {
  return localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
}

export function setGeminiKey(key) {
  localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key);
}

export function getUserProfile() {
  const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!raw) return { name: '', age: '', weight: '', height: '', goal: 2000 };
  try { return JSON.parse(raw); } catch { return { name: '', age: '', weight: '', height: '', goal: 2000 }; }
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
