import { useState, useEffect, useCallback } from 'react';
import { isConnected, connectGoogleFit, disconnectGoogleFit, fetchTodayStats, fetchWeeklySteps } from '../services/googleFit';
import { saveActivitySnapshot, getActivityForDate, getActivityForWeek } from '../services/db';
import WeekChart from '../components/WeekChart';
import { useToast } from '../context/ToastContext';
import './Activity.css';

function HeartRateGauge({ bpm }) {
  const max = 200;
  const pct = Math.min(bpm / max, 1);
  const zone = bpm < 60 ? 'Rest' : bpm < 100 ? 'Fat Burn' : bpm < 140 ? 'Cardio' : 'Peak';
  const color = bpm < 60 ? 'var(--color-secondary)' : bpm < 100 ? 'var(--color-primary)' : bpm < 140 ? 'var(--color-accent)' : 'var(--color-danger)';

  return (
    <div className="hr-gauge glass-card p-6">
      <p className="section-title">Heart Rate</p>
      <div className="hr-display">
        <div className="hr-value" style={{ color }}>
          {bpm || '–'}
          <span className="hr-unit">bpm</span>
        </div>
        <span className="chip" style={{ borderColor: color + '44', background: color + '12', color }}>
          {zone}
        </span>
      </div>
      <div className="hr-bar-track">
        <div className="hr-bar-fill" style={{ width: `${pct * 100}%`, background: color }}/>
      </div>
      <div className="hr-zones">
        <span style={{ color: 'var(--color-secondary)' }}>Rest</span>
        <span style={{ color: 'var(--color-primary)' }}>Fat Burn</span>
        <span style={{ color: 'var(--color-accent)' }}>Cardio</span>
        <span style={{ color: 'var(--color-danger)' }}>Peak</span>
      </div>
    </div>
  );
}

function StepRing({ steps, goal = 10000 }) {
  const pct = Math.min(steps / goal, 1);
  const r = 60;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="step-ring-wrapper">
      <svg viewBox="0 0 160 160" width="140" height="140">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12"/>
        <circle
          cx="80" cy="80" r={r}
          fill="none"
          stroke="url(#stepGrad)"
          strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <defs>
          <linearGradient id="stepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8"/>
            <stop offset="100%" stopColor="#38bdf8"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="step-ring-center">
        <div className="step-count" style={{ color: 'var(--color-secondary)' }}>
          {steps.toLocaleString()}
        </div>
        <div className="step-label">/ {goal.toLocaleString()}</div>
        <div className="step-sub">steps</div>
      </div>
    </div>
  );
}

function CalorieBurnCard({ calories }) {
  return (
    <div className="burn-card glass-card p-6">
      <p className="section-title">Calories Burned</p>
      <div className="burn-value gradient-text-warm">{calories.toLocaleString()}</div>
      <p className="text-muted text-sm">kcal today</p>
      <div className="burn-flame">🔥</div>
    </div>
  );
}

export default function Activity() {
  const [connected, setConnected] = useState(isConnected());
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats]         = useState({ calories: 0, steps: 0, heartRate: 0, activeMinutes: 0 });
  const [weekData, setWeekData]   = useState([]);
  const showToast = useToast();
  const today = new Date().toLocaleDateString('en-CA');

  const loadData = useCallback(async (live = false) => {
    if (live) setRefreshing(true);
    try {
      const cached = await getActivityForDate(today);
      if (cached && !live) setStats(cached);

      if (connected) {
        const [todayStats, weekly] = await Promise.all([fetchTodayStats(), fetchWeeklySteps()]);
        setStats(todayStats);
        setWeekData(weekly);
        await saveActivitySnapshot(todayStats);
      } else {
        const weekly = await getActivityForWeek();
        setWeekData(weekly.map(w => ({ date: new Date(w.timestamp).toLocaleDateString('en', { weekday: 'short' }), steps: w.steps || 0 })));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRefreshing(false);
    }
  }, [connected, today, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connectGoogleFit();
      setConnected(true);
      showToast('Connected to Google Fit! ✓', 'success');
      await loadData(true);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleFit();
    setConnected(false);
    setStats({ calories: 0, steps: 0, heartRate: 0, activeMinutes: 0 });
    showToast('Disconnected from Google Fit', 'success');
  };

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1><span className="gradient-text">Activity</span></h1>
            <p className="text-muted text-sm mt-2">Synced from your Xiaomi Watch 2 via Google Fit</p>
          </div>
          {connected && (
            <button
              id="refresh-activity-btn"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="btn btn-ghost btn-icon"
              aria-label="Refresh activity data"
            >
              {refreshing
                ? <div className="spinner" style={{ width: 16, height: 16 }}/>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
              }
            </button>
          )}
        </div>
      </div>

      {/* Not connected */}
      {!connected && (
        <div className="connect-section glass-card p-8 animate-fade-in-up">
          <div className="connect-watch-icon">⌚</div>
          <h2 className="text-center mt-4">Connect Your Watch</h2>
          <p className="text-muted text-center text-sm mt-2">
            Your Xiaomi Watch 2 syncs data to Google Fit automatically.
            Connect your Google account to pull live calorie burn, steps, and heart rate.
          </p>

          <div className="connect-steps mt-6">
            <div className="connect-step">
              <span className="step-num">1</span>
              <p>Make sure your Xiaomi Watch 2 is synced to the <strong>Zepp / Mi Fitness</strong> app</p>
            </div>
            <div className="connect-step">
              <span className="step-num">2</span>
              <p>Enable <strong>Google Fit sync</strong> in the Mi Fitness settings</p>
            </div>
            <div className="connect-step">
              <span className="step-num">3</span>
              <p>Click the button below to authorize FitAI to read your data</p>
            </div>
          </div>

          <button
            id="connect-google-fit-btn"
            onClick={handleConnect}
            disabled={loading}
            className="btn btn-primary w-full btn-lg mt-8"
          >
            {loading
              ? <><div className="spinner" style={{ width: 18, height: 18 }}/> Connecting…</>
              : <><GoogleIcon/> Connect Google Fit</>
            }
          </button>

          <p className="text-xs text-muted text-center mt-4">
            We only read activity data. We never write or modify your fitness data.
          </p>
        </div>
      )}

      {/* Connected */}
      {connected && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="chip chip-green">● Google Fit Connected</span>
            <button onClick={handleDisconnect} className="btn btn-ghost btn-sm">Disconnect</button>
          </div>

          {/* Calorie burn removed */}

          {/* Steps + Heart Rate row */}
          <div className="two-col mt-4">
            <div className="glass-card p-6 flex flex-col items-center">
              <StepRing steps={stats.steps}/>
            </div>
            <HeartRateGauge bpm={stats.heartRate}/>
          </div>

          {/* Active minutes */}
          <div className="glass-card p-6 mt-4">
            <p className="section-title">Active Minutes</p>
            <div className="flex items-center gap-4">
              <div className="active-min-val gradient-text">{stats.activeMinutes}</div>
              <div>
                <p className="font-semibold">min active today</p>
                <p className="text-muted text-sm">Goal: 30 min / day</p>
              </div>
            </div>
            <div className="progress-bar mt-4">
              <div className="progress-fill" style={{ width: `${Math.min(stats.activeMinutes / 30, 1) * 100}%` }}/>
            </div>
          </div>

          {/* Weekly Steps chart */}
          {weekData.length > 0 && (
            <div className="glass-card p-6 mt-4">
              <p className="section-title">7-Day Steps</p>
              <WeekChart data={weekData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
