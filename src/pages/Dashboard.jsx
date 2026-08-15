import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMealsForDate, getActivityForDate } from '../services/db';
import { getUserProfile } from '../services/storage';
import { isConnected, fetchTodayStats, fetchWeeklyCalories } from '../services/googleFit';
import { saveActivitySnapshot } from '../services/db';
import './Dashboard.css';

function CalorieArc({ consumed, burned, goal }) {
  const net = consumed - burned;
  const pct = Math.min(consumed / goal, 1);
  const r = 80;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="arc-wrapper">
      <svg className="arc-svg" viewBox="0 0 200 200" width="200" height="200">
        {/* Background track */}
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14"/>
        {/* Burned arc (behind) */}
        <circle
          cx="100" cy="100" r={r}
          fill="none"
          stroke="url(#burnGrad)"
          strokeWidth="14"
          strokeDasharray={`${Math.min(burned / goal, 1) * circ} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          opacity="0.5"
        />
        {/* Consumed arc */}
        <circle
          cx="100" cy="100" r={r}
          fill="none"
          stroke="url(#consumeGrad)"
          strokeWidth="14"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <defs>
          <linearGradient id="consumeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6ee7b7"/>
            <stop offset="100%" stopColor="#818cf8"/>
          </linearGradient>
          <linearGradient id="burnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c"/>
            <stop offset="100%" stopColor="#f87171"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="arc-center">
        <div className="arc-net" style={{ color: net > 0 ? 'var(--color-accent)' : 'var(--color-primary)' }}>
          {net > 0 ? '+' : ''}{net}
        </div>
        <div className="arc-net-label">kcal net</div>
        <div className="arc-sub">
          <span style={{ color: 'var(--color-primary)' }}>↑ {consumed}</span>
          <span style={{ color: 'var(--text-muted)' }}> / </span>
          <span style={{ color: 'var(--color-accent)' }}>↓ {burned}</span>
        </div>
      </div>
    </div>
  );
}

function MacroBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(value / max, 1) * 100 : 0;
  return (
    <div className="macro-bar-item">
      <div className="macro-bar-header">
        <span className="macro-bar-label">{label}</span>
        <span className="macro-bar-value">{value}g</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }}/>
      </div>
    </div>
  );
}

function WeekChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.calories), 1);

  return (
    <div className="week-chart">
      {data.map((d, i) => (
        <div key={i} className="week-bar-col">
          <div className="week-bar-track">
            <div
              className="week-bar-fill"
              style={{ height: `${(d.calories / max) * 100}%` }}
            />
          </div>
          <span className="week-bar-label">{d.date}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [meals, setMeals] = useState([]);
  const [activity, setActivity] = useState({ calories: 0, steps: 0, heartRate: 0, activeMinutes: 0 });
  const [weekData, setWeekData] = useState([]);
  const [profile] = useState(getUserProfile);
  const [loading, setLoading] = useState(true);
  const connected = isConnected();

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todayMeals, cachedActivity] = await Promise.all([
        getMealsForDate(today),
        getActivityForDate(today),
      ]);
      setMeals(todayMeals);
      if (cachedActivity) setActivity(cachedActivity);

      if (connected) {
        try {
          const [stats, weekly] = await Promise.all([fetchTodayStats(), fetchWeeklyCalories()]);
          setActivity(stats);
          setWeekData(weekly);
          await saveActivitySnapshot(stats);
        } catch {
          // silently use cached data
        }
      }
    } finally {
      setLoading(false);
    }
  }, [today, connected]);

  useEffect(() => { load(); }, [load]);

  const consumed = meals.reduce((s, m) => s + (m.total_calories || 0), 0);
  const burned = activity.calories;
  const goal = parseInt(profile.goal) || 2000;

  const totalProtein = meals.reduce((s, m) => s + (m.total_protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.total_carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.total_fat || 0), 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <p className="text-muted text-sm">{greeting()}{profile.name ? `, ${profile.name}` : ''} 👋</p>
        <h1 className="mt-2">Today's <span className="gradient-text">Balance</span></h1>
        <p className="text-muted text-sm mt-2">
          {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Calorie Arc */}
      <div className="glass-card p-6 flex flex-col items-center mb-4">
        <CalorieArc consumed={consumed} burned={burned} goal={goal} />
        <div className="arc-legend">
          <div className="arc-legend-item">
            <span className="arc-legend-dot" style={{ background: 'var(--grad-primary)' }}/>
            <span>Consumed</span>
          </div>
          <div className="arc-legend-item">
            <span className="arc-legend-dot" style={{ background: 'var(--grad-warm)' }}/>
            <span>Burned</span>
          </div>
          <div className="arc-legend-item">
            <span className="arc-legend-dot" style={{ background: 'var(--color-border)' }}/>
            <span>Goal {goal} kcal</span>
          </div>
        </div>
      </div>

      {/* Macro Breakdown */}
      <div className="glass-card p-6 mb-4">
        <p className="section-title">Today's Macros</p>
        <div className="flex flex-col gap-3">
          <MacroBar label="Protein" value={Math.round(totalProtein)} max={150} color="var(--grad-primary)"/>
          <MacroBar label="Carbs"   value={Math.round(totalCarbs)}   max={300} color="var(--grad-cool)"/>
          <MacroBar label="Fat"     value={Math.round(totalFat)}     max={80}  color="var(--grad-warm)"/>
        </div>
      </div>

      {/* Activity Stats */}
      {connected ? (
        <div className="glass-card p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title" style={{ marginBottom: 0 }}>Activity</p>
            <span className="chip chip-green">● Live</span>
          </div>
          <div className="stat-grid">
            <div className="stat-block">
              <div className="stat-value gradient-text-warm">{burned}</div>
              <div className="stat-label">kcal burned</div>
            </div>
            <div className="stat-block">
              <div className="stat-value" style={{ color: 'var(--color-secondary)' }}>{activity.steps.toLocaleString()}</div>
              <div className="stat-label">steps</div>
            </div>
            <div className="stat-block">
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{activity.heartRate || '–'}</div>
              <div className="stat-label">bpm</div>
            </div>
            <div className="stat-block">
              <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{activity.activeMinutes}</div>
              <div className="stat-label">active min</div>
            </div>
          </div>
        </div>
      ) : (
        <Link to="/activity" className="glass-card p-6 mb-4 connect-cta">
          <div className="flex items-center gap-4">
            <div className="cta-icon">⌚</div>
            <div>
              <p className="font-semibold">Connect your watch</p>
              <p className="text-muted text-sm mt-2">Link Google Fit to see live calorie burn</p>
            </div>
            <svg className="cta-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </Link>
      )}

      {/* Weekly Chart */}
      {weekData.length > 0 && (
        <div className="glass-card p-6 mb-4">
          <p className="section-title">7-Day Burn</p>
          <WeekChart data={weekData} />
        </div>
      )}

      {/* Today's Meals */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title" style={{ marginBottom: 0 }}>Today's Meals</p>
          <Link to="/log-meal" className="btn btn-sm btn-ghost">+ Add</Link>
        </div>

        {loading ? (
          <div className="flex justify-center p-4"><div className="spinner"/></div>
        ) : meals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <p>No meals logged yet</p>
            <Link to="/log-meal" className="btn btn-primary btn-sm mt-4">Log First Meal</Link>
          </div>
        ) : (
          <div className="meal-list">
            {meals.map(meal => (
              <div key={meal.id} className="meal-item">
                {meal.imageUrl && (
                  <img src={meal.imageUrl} alt={meal.meal_type || 'meal'} className="meal-thumb"/>
                )}
                <div className="meal-info">
                  <p className="font-semibold">{meal.meal_type
                    ? meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)
                    : 'Meal'}</p>
                  <p className="text-muted text-sm">
                    {meal.items?.slice(0, 2).map(i => i.name).join(', ')}
                    {meal.items?.length > 2 ? ` +${meal.items.length - 2} more` : ''}
                  </p>
                </div>
                <div className="meal-cal">
                  <span className="gradient-text font-bold">{meal.total_calories}</span>
                  <span className="text-xs text-muted">kcal</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
