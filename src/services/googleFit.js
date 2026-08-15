import { getGoogleFitToken, setGoogleFitToken, clearGoogleFitToken } from './storage';

// ⚠️  Replace with your Google Cloud OAuth 2.0 Client ID
// Create one at: https://console.cloud.google.com/apis/credentials
// Application type: Web application
// Authorized JavaScript origins: http://localhost:5173 (dev) + your production domain
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
].join(' ');

const FIT_API = 'https://www.googleapis.com/fitness/v1/users/me';

// ---- Auth ----
export function isConnected() {
  return !!getGoogleFitToken();
}

export function connectGoogleFit() {
  if (!CLIENT_ID) {
    throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
  }

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: window.location.origin + '/oauth/callback',
      response_type: 'token',
      scope: SCOPES,
      include_granted_scopes: 'true',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const popup = window.open(authUrl, 'google_fit_auth', 'width=500,height=600,left=200,top=100');

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    const checkInterval = setInterval(() => {
      try {
        const url = new URL(popup.location.href);
        if (url.origin === window.location.origin) {
          const hash = new URLSearchParams(url.hash.substring(1));
          const token = hash.get('access_token');
          const expiresIn = parseInt(hash.get('expires_in') || '3600');
          if (token) {
            setGoogleFitToken(token, expiresIn);
            popup.close();
            clearInterval(checkInterval);
            resolve(token);
          }
        }
      } catch {
        // Cross-origin, still on Google's page — keep waiting
      }

      if (popup.closed) {
        clearInterval(checkInterval);
        reject(new Error('Authentication cancelled.'));
      }
    }, 500);
  });
}

export function disconnectGoogleFit() {
  clearGoogleFitToken();
}

// ---- Data Fetching ----
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function now() {
  return Date.now();
}

async function fitRequest(endpoint, body) {
  const token = getGoogleFitToken();
  if (!token) throw new Error('Not connected to Google Fit. Please connect first.');

  const res = await fetch(`${FIT_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    clearGoogleFitToken();
    throw new Error('Google Fit session expired. Please reconnect.');
  }

  if (!res.ok) throw new Error(`Google Fit API error: ${res.status}`);
  return res.json();
}

export async function fetchTodayStats() {
  const startMs = startOfToday();
  const endMs = now();

  const requestBody = {
    aggregateBy: [
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.heart_rate.bpm' },
      { dataTypeName: 'com.google.active_minutes' },
    ],
    bucketByTime: { durationMillis: endMs - startMs },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  };

  const data = await fitRequest('/dataset:aggregate', requestBody);

  const result = {
    calories: 0,
    steps: 0,
    heartRate: 0,
    activeMinutes: 0,
  };

  if (!data.bucket?.[0]?.dataset) return result;

  for (const dataset of data.bucket[0].dataset) {
    const point = dataset.point?.[0];
    if (!point) continue;

    const typeName = dataset.dataSourceId || '';

    if (typeName.includes('calories.expended')) {
      result.calories = Math.round(point.value?.[0]?.fpVal || 0);
    } else if (typeName.includes('step_count')) {
      result.steps = point.value?.[0]?.intVal || 0;
    } else if (typeName.includes('heart_rate')) {
      result.heartRate = Math.round(point.value?.[0]?.fpVal || 0);
    } else if (typeName.includes('active_minutes')) {
      result.activeMinutes = Math.round(point.value?.[0]?.intVal || point.value?.[0]?.fpVal || 0);
    }
  }

  return result;
}

export async function fetchWeeklyCalories() {
  const end = now();
  const start = end - 7 * 24 * 60 * 60 * 1000;

  const requestBody = {
    aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
    bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
    startTimeMillis: start,
    endTimeMillis: end,
  };

  const data = await fitRequest('/dataset:aggregate', requestBody);

  return (data.bucket || []).map((bucket) => {
    const point = bucket.dataset?.[0]?.point?.[0];
    const date = new Date(parseInt(bucket.startTimeMillis)).toLocaleDateString('en', { weekday: 'short' });
    return {
      date,
      calories: Math.round(point?.value?.[0]?.fpVal || 0),
    };
  });
}
