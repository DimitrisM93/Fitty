import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchMealsRange, fetchProfile } from '../services/api';
import './Overview.css';

// ─── Helpers ─────────────────────────────────────────────
function formatDate(d) {
  return d.toLocaleDateString('en-CA');
}

function getWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay() || 7; // Mon=1
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1 + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: formatDate(mon), to: formatDate(sun), label: `${mon.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en', { month: 'short', day: 'numeric' })}` };
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { from: formatDate(first), to: formatDate(last), label: first.toLocaleDateString('en', { month: 'long', year: 'numeric' }) };
}

function groupByDate(meals) {
  const groups = {};
  for (const m of meals) {
    const d = m.meal_date?.split('T')[0] || m.meal_date;
    if (!groups[d]) groups[d] = [];
    groups[d].push(m);
  }
  return groups;
}

// ─── Bar Chart ───────────────────────────────────────────
function BarChart({ data, maxVal }) {
  const actualMax = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="overview-bar-chart">
      {data.map((d, i) => (
        <div key={i} className="overview-bar-col">
          <div className="overview-bar-value">{d.value > 0 ? d.value : ''}</div>
          <div className="overview-bar-track">
            <div
              className="overview-bar-fill"
              style={{ height: `${Math.min((d.value / actualMax) * 100, 100)}%` }}
            />
          </div>
          <span className="overview-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Heatmap Calendar ────────────────────────────────────
function HeatmapCalendar({ year, month, dailyData, goal }) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay() || 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 1; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getIntensity = (day) => {
    if (!day) return 0;
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cals = dailyData[ds] || 0;
    if (cals === 0) return 0;
    const pct = cals / goal;
    if (pct < 0.25) return 1;
    if (pct < 0.5) return 2;
    if (pct < 0.75) return 3;
    if (pct <= 1.1) return 4;
    return 5; // over goal
  };

  return (
    <div className="heatmap">
      <div className="heatmap-weekdays">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="heatmap-grid">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`heatmap-cell intensity-${day ? getIntensity(day) : 0}`}
            title={day ? `Day ${day}` : ''}
          >
            {day || ''}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="text-xs text-muted">Less</span>
        <div className="heatmap-cell intensity-1 mini"/>
        <div className="heatmap-cell intensity-2 mini"/>
        <div className="heatmap-cell intensity-3 mini"/>
        <div className="heatmap-cell intensity-4 mini"/>
        <div className="heatmap-cell intensity-5 mini"/>
        <span className="text-xs text-muted">More</span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function Overview() {
  const [tab, setTab] = useState('weekly'); // weekly | monthly
  const [offset, setOffset] = useState(0);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(2000);

  const range = useMemo(() => {
    return tab === 'weekly' ? getWeekRange(offset) : getMonthRange(offset);
  }, [tab, offset]);

  useEffect(() => {
    setOffset(0);
  }, [tab]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchMealsRange(range.from, range.to);
        setMeals(data);
      } catch {
        setMeals([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  useEffect(() => {
    fetchProfile().then(p => {
      if (p?.calorie_goal) setGoal(p.calorie_goal);
    }).catch(() => {});
  }, []);

  const grouped = useMemo(() => groupByDate(meals), [meals]);

  // Daily calorie map
  const dailyCals = useMemo(() => {
    const map = {};
    for (const [date, dayMeals] of Object.entries(grouped)) {
      map[date] = dayMeals.reduce((s, m) => s + (m.total_calories || 0), 0);
    }
    return map;
  }, [grouped]);

  // Stats
  const totalCals = meals.reduce((s, m) => s + (m.total_calories || 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.total_protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.total_carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.total_fat || 0), 0);
  const daysWithData = Object.keys(grouped).length;
  const avgCals = daysWithData > 0 ? Math.round(totalCals / daysWithData) : 0;
  const avgProtein = daysWithData > 0 ? Math.round(totalProtein / daysWithData) : 0;
  const avgCarbs = daysWithData > 0 ? Math.round(totalCarbs / daysWithData) : 0;
  const avgFat = daysWithData > 0 ? Math.round(totalFat / daysWithData) : 0;

  // Chart data
  const chartData = useMemo(() => {
    if (tab === 'weekly') {
      const from = new Date(range.from + 'T00:00:00');
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(from);
        d.setDate(from.getDate() + i);
        const ds = formatDate(d);
        return {
          label: d.toLocaleDateString('en', { weekday: 'short' }),
          value: dailyCals[ds] || 0,
        };
      });
    } else {
      const from = new Date(range.from + 'T00:00:00');
      const to = new Date(range.to + 'T00:00:00');
      const data = [];
      const d = new Date(from);
      while (d <= to) {
        const ds = formatDate(d);
        data.push({
          label: d.getDate() % 5 === 1 || d.getDate() === 1 ? String(d.getDate()) : '',
          value: dailyCals[ds] || 0,
        });
        d.setDate(d.getDate() + 1);
      }
      return data;
    }
  }, [tab, range, dailyCals]);

  // For monthly heatmap
  const monthDate = useMemo(() => {
    const d = new Date(range.from + 'T00:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [range]);

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1><span className="gradient-text">Overview</span></h1>
      </div>

      {/* Tab Switcher */}
      <div className="overview-tabs mb-4">
        <button
          className={`overview-tab ${tab === 'weekly' ? 'active' : ''}`}
          onClick={() => setTab('weekly')}
        >
          Weekly
        </button>
        <button
          className={`overview-tab ${tab === 'monthly' ? 'active' : ''}`}
          onClick={() => setTab('monthly')}
        >
          Monthly
        </button>
      </div>

      {/* Period Navigation */}
      <div className="period-nav mb-4">
        <button className="period-arrow" onClick={() => setOffset(o => o - 1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="period-label">{range.label}</span>
        <button className="period-arrow" onClick={() => setOffset(o => o + 1)} disabled={offset >= 0}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-6"><div className="spinner"/></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="overview-summary mb-4">
            <div className="glass-card overview-stat-card">
              <div className="overview-stat-value gradient-text">{totalCals.toLocaleString()}</div>
              <div className="overview-stat-label">Total kcal</div>
            </div>
            <div className="glass-card overview-stat-card">
              <div className="overview-stat-value" style={{ color: 'var(--color-primary)' }}>{avgCals}</div>
              <div className="overview-stat-label">Avg / day</div>
            </div>
            <div className="glass-card overview-stat-card">
              <div className="overview-stat-value" style={{ color: 'var(--color-secondary)' }}>{meals.length}</div>
              <div className="overview-stat-label">Meals</div>
            </div>
            <div className="glass-card overview-stat-card">
              <div className="overview-stat-value" style={{ color: 'var(--color-accent)' }}>{daysWithData}</div>
              <div className="overview-stat-label">Days logged</div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="glass-card p-6 mb-4">
            <p className="section-title">Daily Calories</p>
            {chartData.some(d => d.value > 0) ? (
              <BarChart data={chartData} maxVal={goal * 1.3} />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p>No data for this period</p>
              </div>
            )}
          </div>

          {/* Avg Macros */}
          <div className="glass-card p-6 mb-4">
            <p className="section-title">Average Daily Macros</p>
            <div className="overview-macro-row">
              <div className="overview-macro-card">
                <div className="overview-macro-value" style={{ color: 'var(--color-primary)' }}>{avgProtein}g</div>
                <div className="overview-macro-label">Protein</div>
              </div>
              <div className="overview-macro-card">
                <div className="overview-macro-value" style={{ color: 'var(--color-secondary)' }}>{avgCarbs}g</div>
                <div className="overview-macro-label">Carbs</div>
              </div>
              <div className="overview-macro-card">
                <div className="overview-macro-value" style={{ color: 'var(--color-accent)' }}>{avgFat}g</div>
                <div className="overview-macro-label">Fat</div>
              </div>
            </div>
          </div>

          {/* Monthly Heatmap (monthly tab only) */}
          {tab === 'monthly' && (
            <div className="glass-card p-6 mb-4">
              <p className="section-title">Calorie Heatmap</p>
              <HeatmapCalendar
                year={monthDate.year}
                month={monthDate.month}
                dailyData={dailyCals}
                goal={goal}
              />
            </div>
          )}

          {/* Day Breakdown */}
          <div className="glass-card p-6 mb-4">
            <p className="section-title">Day-by-Day</p>
            {daysWithData === 0 ? (
              <div className="empty-state">
                <p className="text-muted text-sm">No meals logged in this period</p>
              </div>
            ) : (
              <div className="day-breakdown">
                {Object.entries(grouped)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, dayMeals]) => {
                    const dayCals = dayMeals.reduce((s, m) => s + (m.total_calories || 0), 0);
                    const pct = Math.min(dayCals / goal, 1);
                    const dateObj = new Date(date + 'T00:00:00');
                    return (
                      <div key={date} className="day-row">
                        <div className="day-row-date">
                          <span className="day-row-weekday">{dateObj.toLocaleDateString('en', { weekday: 'short' })}</span>
                          <span className="day-row-day">{dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="day-row-bar">
                          <div className="day-row-fill" style={{ width: `${pct * 100}%` }}/>
                        </div>
                        <div className="day-row-cal">
                          <span className="gradient-text font-bold">{dayCals}</span>
                          <span className="text-xs text-muted">kcal</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
