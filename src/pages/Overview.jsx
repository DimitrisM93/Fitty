import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchMealsRange, fetchProfile, fetchWeightLogs } from '../services/api';
import { getExerciseLogs, saveExerciseAnswer } from '../services/storage';
import { getGreekTodayStr } from '../services/dateUtils';
import html2canvas from 'html2canvas';
import './Overview.css';

// ─── Helpers ─────────────────────────────────────────────
function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

function get15DaysRange(offset = 0) {
  const to = new Date();
  to.setDate(to.getDate() + offset * 15);
  const from = new Date(to);
  from.setDate(to.getDate() - 14); // 15 days total
  return { from: formatDate(from), to: formatDate(to), label: `${from.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString('en', { month: 'short', day: 'numeric' })}` };
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

// ─── Exercise Calendar ───────────────────────────────────
function ExerciseCalendar({ range }) {
  const [logs, setLogs] = useState({});
  
  useEffect(() => {
    setLogs(getExerciseLogs());
  }, []);

  const handleToggle = (dateStr, currentStatus, isFuture) => {
    if (isFuture) return;
    const newStatus = currentStatus === 'yes' ? 'no' : 'yes';
    const updatedLogs = saveExerciseAnswer(dateStr, newStatus);
    setLogs({ ...updatedLogs });
  };

  const days = [];
  const from = new Date(range.from.replace(/-/g, '/'));
  const to = new Date(range.to.replace(/-/g, '/'));
  const todayStr = getGreekTodayStr();
  const duration = (to - from) / (1000 * 60 * 60 * 24);
  const d = new Date(from);
  const debugText = `DEBUG: todayStr=${todayStr}, realTime=${new Date().toISOString()}`;
  
  while (d <= to) {
    const dateStr = formatDate(d);
    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    const dayNum = d.getDate();
    const label = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    
    let status = logs[dateStr];
    if (status !== 'yes' && status !== 'no') {
      status = isFuture ? null : 'no';
    }

    days.push({
      dateStr,
      label: duration > 14 ? dayNum : label,
      dayNum,
      status,
      isToday,
      isFuture
    });
    d.setDate(d.getDate() + 1);
  }

  return (
    <div className="glass-card p-6 mb-4 animate-fade-in exercise-calendar-wrapper">
      <div className="flex items-center justify-between mb-4">
        <p className="section-title mb-0 flex items-center gap-2">
          Workout History
        </p>
        <span className="text-xs text-muted">{range.label || 'Selected Period'}</span>
      </div>
      <div className="text-[10px] text-red-500 mb-2">{debugText}</div>
      <div className="exercise-calendar-row">
        {days.map((d, i) => (
          <div 
            key={i} 
            className={`exercise-tick-cell ${d.status === 'yes' ? 'yes' : d.status === 'no' ? 'no' : ''} ${d.isToday ? 'today' : ''}`} 
            title={d.dateStr}
            style={{ cursor: d.isFuture ? 'default' : 'pointer' }}
            onClick={() => handleToggle(d.dateStr, d.status, d.isFuture)}
          >
            <div className="tick-label">{d.label}</div>
            <div className="tick-circle">
              {d.status === 'yes' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              {d.status === 'no' && <span style={{ opacity: 0.3, fontSize: '10px' }}>-</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function Overview() {
  const [tab, setTab] = useState('weekly'); // weekly | 15days | monthly | custom
  const [offset, setOffset] = useState(0);
  const [customRange, setCustomRange] = useState({
    from: formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    to: formatDate(new Date())
  });
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(2000);
  const [latestWeight, setLatestWeight] = useState(null);

  const range = useMemo(() => {
    if (tab === 'weekly') return getWeekRange(offset);
    if (tab === '15days') return get15DaysRange(offset);
    if (tab === 'monthly') return getMonthRange(offset);
    return { from: customRange.from, to: customRange.to, label: 'Custom Range' };
  }, [tab, offset, customRange]);

  useEffect(() => {
    if (tab !== 'custom') {
      setOffset(0);
    }
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
    Promise.all([
      fetchProfile().catch(() => null),
      fetchWeightLogs().catch(() => []),
    ]).then(([p, logs]) => {
      if (p?.calorie_goal) setGoal(p.calorie_goal);
      let w = p?.weight || null;
      if (logs && logs.length > 0) {
        const sorted = [...logs].sort((a, b) => {
          const dateA = a.log_date || a.date || '';
          const dateB = b.log_date || b.date || '';
          return dateB.localeCompare(dateA);
        });
        if (sorted[0]?.weight) w = sorted[0].weight;
      }
      if (w) setLatestWeight(w);
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
      const from = new Date(range.from.replace(/-/g, '/'));
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
      const from = new Date(range.from.replace(/-/g, '/'));
      const to = new Date(range.to.replace(/-/g, '/'));
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
    const d = new Date(range.from.replace(/-/g, '/'));
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [range]);

  const handleDownloadCSV = useCallback(() => {
    if (!meals || meals.length === 0) return;
    
    // Sort meals by date
    const sortedMeals = [...meals].sort((a, b) => {
      const dateA = a.meal_date ? new Date(a.meal_date) : new Date(a.created_at);
      const dateB = b.meal_date ? new Date(b.meal_date) : new Date(b.created_at);
      return dateB - dateA;
    });
    
    // Create CSV content
    const headers = ['Date', 'Time', 'Meal Type', 'Name/Notes', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
    const rows = sortedMeals.map(m => {
      const d = m.meal_date ? new Date(m.meal_date) : new Date(m.created_at || Date.now());
      const dateStr = d.toLocaleDateString('en-CA');
      const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const mealName = m.items && m.items.length > 0 ? m.items.map(i => i.name).join(' + ') : m.notes || '';
      return [
        dateStr,
        timeStr,
        m.meal_type || 'meal',
        `"${mealName.replace(/"/g, '""')}"`, // escape quotes
        m.total_calories || 0,
        m.total_protein || 0,
        m.total_carbs || 0,
        m.total_fat || 0
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fitai-report-${range.from}-to-${range.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [meals, range]);

  const reportRef = useRef(null);

  const handleScreenshot = async () => {
    if (!reportRef.current) return;
    try {
      // Temporarily remove animation class so it doesn't trigger opacity issues on clone
      reportRef.current.classList.remove('animate-fade-in');
      
      // Add a slight delay as requested to let the DOM fully settle
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0a0d14',
        useCORS: true,
      });
      
      // Restore animation class
      reportRef.current.classList.add('animate-fade-in');

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `fitai-report-${range.from}-to-${range.to}.png`;
      link.click();
    } catch (error) {
      console.error('Failed to capture screenshot', error);
      if (reportRef.current) reportRef.current.classList.add('animate-fade-in');
    }
  };

  return (
    <div className="page animate-fade-in" ref={reportRef}>
      <div className="page-header flex justify-between items-center mb-6">
        <h1 style={{ marginBottom: 0 }}><span className="gradient-text">Overview</span></h1>
        {meals.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleScreenshot} className="btn btn-sm" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Image
            </button>
            <button onClick={handleDownloadCSV} className="btn btn-sm" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              CSV
            </button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="overview-tabs mb-4 flex-wrap" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <button
          className={`overview-tab ${tab === 'weekly' ? 'active' : ''}`}
          onClick={() => setTab('weekly')}
        >
          Weekly
        </button>
        <button
          className={`overview-tab ${tab === '15days' ? 'active' : ''}`}
          onClick={() => setTab('15days')}
        >
          15 Days
        </button>
        <button
          className={`overview-tab ${tab === 'monthly' ? 'active' : ''}`}
          onClick={() => setTab('monthly')}
        >
          Monthly
        </button>
        <button
          className={`overview-tab ${tab === 'custom' ? 'active' : ''}`}
          onClick={() => setTab('custom')}
        >
          Custom
        </button>
      </div>

      {tab === 'custom' && (
        <div className="glass-card p-4 mb-4 flex gap-4 items-center justify-between">
          <div className="flex flex-col flex-1">
            <label className="text-xs text-muted mb-1">Start Date</label>
            <input 
              type="date" 
              className="input text-sm p-2" 
              value={customRange.from}
              onChange={e => setCustomRange(c => ({ ...c, from: e.target.value }))}
            />
          </div>
          <div className="flex flex-col flex-1">
            <label className="text-xs text-muted mb-1">End Date</label>
            <input 
              type="date" 
              className="input text-sm p-2" 
              value={customRange.to}
              onChange={e => setCustomRange(c => ({ ...c, to: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Period Navigation */}
      {tab !== 'custom' && (
        <div className="period-nav mb-4">
          <button className="period-arrow" onClick={() => setOffset(o => o - 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="period-label">{range.label}</span>
          <button className="period-arrow" onClick={() => setOffset(o => o + 1)} disabled={offset >= 0}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}

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
            {latestWeight && (
              <div className="glass-card overview-stat-card">
                <div className="overview-stat-value" style={{ color: '#6ee7b7' }}>{latestWeight} <span className="text-xs text-muted font-normal">kg</span></div>
                <div className="overview-stat-label">Latest Weight</div>
              </div>
            )}
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

          {/* Workout Calendar */}
          <ExerciseCalendar range={range} />

          {/* Avg Macros */}
          <div className="glass-card p-6 mb-4">
            <p className="section-title">Overall Period Macros</p>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--color-primary)]">Protein</span>
                <span>Total: <b className="text-white">{Math.round(totalProtein)}g</b> (Avg: {avgProtein}g)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--color-secondary)]">Carbs</span>
                <span>Total: <b className="text-white">{Math.round(totalCarbs)}g</b> (Avg: {avgCarbs}g)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--color-accent)]">Fat</span>
                <span>Total: <b className="text-white">{Math.round(totalFat)}g</b> (Avg: {avgFat}g)</span>
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

          {/* Day Breakdown Detailed Report */}
          <div className="glass-card p-6 mb-4">
            <p className="section-title">Detailed Report</p>
            {daysWithData === 0 ? (
              <div className="empty-state">
                <p className="text-muted text-sm">No meals logged in this period</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {Object.entries(grouped)
                  .sort(([a], [b]) => b.localeCompare(a)) // Sort newest first
                  .map(([date, dayMeals]) => {
                    const dayCals = dayMeals.reduce((s, m) => s + (m.total_calories || 0), 0);
                    const dayP = dayMeals.reduce((s, m) => s + (m.total_protein || 0), 0);
                    const dayC = dayMeals.reduce((s, m) => s + (m.total_carbs || 0), 0);
                    const dayF = dayMeals.reduce((s, m) => s + (m.total_fat || 0), 0);
                    const dateObj = new Date(date.replace(/-/g, '/'));
                    return (
                      <div key={date} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-6 shadow-md">
                        {/* Header */}
                        <div className="p-5" style={{ 
                          background: 'linear-gradient(to right, rgba(255,255,255,0.02), rgba(255,255,255,0))',
                          borderBottom: '1px solid var(--color-border)',
                          paddingBottom: '28px'
                        }}>
                          <div className="flex justify-between items-end mb-4">
                             <h3 className="font-bold text-xl text-white tracking-wide">
                               {dateObj.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                             </h3>
                             <div className="text-right">
                               <span className="font-bold text-2xl gradient-text">{dayCals}</span>
                               <span className="text-xs text-muted ml-1">kcal</span>
                             </div>
                          </div>
                          
                          <div className="flex gap-6 text-sm font-medium mt-1">
                             <div className="flex items-center gap-1.5" style={{color: 'var(--color-primary)'}}>
                               <div className="w-2 h-2 rounded-full bg-current"></div>
                               {Math.round(dayP)}g P
                             </div>
                             <div className="flex items-center gap-1.5" style={{color: 'var(--color-secondary)'}}>
                               <div className="w-2 h-2 rounded-full bg-current"></div>
                               {Math.round(dayC)}g C
                             </div>
                             <div className="flex items-center gap-1.5" style={{color: 'var(--color-accent)'}}>
                               <div className="w-2 h-2 rounded-full bg-current"></div>
                               {Math.round(dayF)}g F
                             </div>
                          </div>
                        </div>

                        {/* Meals */}
                        <div className="flex flex-col" style={{ paddingTop: '8px' }}>
                           {dayMeals.map((m, idx) => (
                              <div key={m.id}>
                                 <div className="flex justify-between items-center" style={{ padding: '24px 20px' }}>
                                    <div className="flex-1 pr-4">
                                      <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                                        {m.meal_type ? m.meal_type : 'Meal'}
                                      </div>
                                      <div className="font-medium text-[15px] text-white leading-snug">
                                        {m.items && m.items.length > 0
                                          ? m.items.slice(0, 2).map(i => i.name).join(', ') + (m.items.length > 2 ? ` +${m.items.length - 2}` : '')
                                          : m.notes || 'Unnamed Meal'}
                                      </div>
                                    </div>
                                    
                                    <div className="text-right">
                                      <div className="font-bold text-lg text-white mb-1">{m.total_calories} <span className="text-[11px] text-muted font-normal">kcal</span></div>
                                      <div className="flex justify-end gap-3 text-xs font-semibold">
                                        <span style={{color: 'var(--color-primary)'}}>{Math.round(m.total_protein || 0)}p</span>
                                        <span style={{color: 'var(--color-secondary)'}}>{Math.round(m.total_carbs || 0)}c</span>
                                        <span style={{color: 'var(--color-accent)'}}>{Math.round(m.total_fat || 0)}f</span>
                                      </div>
                                    </div>
                                 </div>
                                 {idx !== dayMeals.length - 1 && (
                                    <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 20px' }}></div>
                                 )}
                              </div>
                           ))}
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
