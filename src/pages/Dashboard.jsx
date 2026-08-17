import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchMeals, fetchMealsRange, deleteMeal, updateMeal, saveFavorite } from '../services/api';
import { fetchProfile } from '../services/api';
import { isConnected, fetchTodayStats, fetchWeeklySteps } from '../services/googleFit';
import { saveActivitySnapshot, getActivityForDate } from '../services/db';
import { useToast } from '../context/ToastContext';
import WeekChart from '../components/WeekChart';
import './Dashboard.css';

function LiveClock() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
      {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
    </div>
  );
}

function CalorieArc({ consumed, goal }) {
  const pct = Math.min(consumed / goal, 1);
  const r = 80;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="arc-wrapper">
      <svg className="arc-svg" viewBox="0 0 200 200" width="200" height="200">
        {/* Background track */}
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14"/>
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
        </defs>
      </svg>
      <div className="arc-center">
        <div className="arc-net" style={{ color: 'var(--color-primary)' }}>
          {consumed}
        </div>
        <div className="arc-net-label">kcal</div>
        <div className="arc-sub">
          <span style={{ color: 'var(--text-muted)' }}>Goal: {goal}</span>
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

function CalendarPicker({ selectedDate, onSelect, onClose, mealDates }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const days = useMemo(() => {
    const first = new Date(viewDate.year, viewDate.month, 1);
    const startDay = first.getDay() || 7; // Mon=1
    const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
    const cells = [];
    // Padding for days before the 1st (Monday start)
    for (let i = 1; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewDate]);

  const monthLabel = new Date(viewDate.year, viewDate.month).toLocaleDateString('en', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toLocaleDateString('en-CA');

  const prevMonth = () => setViewDate(v => {
    const m = v.month - 1;
    return m < 0 ? { year: v.year - 1, month: 11 } : { ...v, month: m };
  });
  const nextMonth = () => setViewDate(v => {
    const m = v.month + 1;
    return m > 11 ? { year: v.year + 1, month: 0 } : { ...v, month: m };
  });

  const toDateStr = (day) => {
    const m = String(viewDate.month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewDate.year}-${m}-${d}`;
  };

  return (
    <div className="calendar-dropdown animate-scale-in">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
        <span className="calendar-month-label">{monthLabel}</span>
        <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
      </div>
      <div className="calendar-weekdays">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="calendar-grid">
        {days.map((day, i) => {
          if (day === null) return <span key={`e${i}`} className="calendar-cell empty"/>;
          const ds = toDateStr(day);
          const isSelected = ds === selectedDate;
          const isToday = ds === todayStr;
          const hasMeals = mealDates.has(ds);
          return (
            <button
              key={ds}
              className={`calendar-cell${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
              onClick={() => { onSelect(ds); onClose(); }}
            >
              {day}
              {hasMeals && <span className="calendar-dot"/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}


export default function Dashboard() {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [meals, setMeals] = useState([]);
  const [activity, setActivity] = useState({ calories: 0, steps: 0, heartRate: 0, activeMinutes: 0 });
  const [weekData, setWeekData] = useState([]);
  const [profile, setProfile] = useState({ name: '', goal: 2000, weight: '', height: '', age: '', gender: 'male' });
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mealDates, setMealDates] = useState(new Set());
  const connected = isConnected();
  const showToast = useToast();

  const isToday = selectedDate === todayStr;

  // Load meals for selected date + profile (once)
  const loadMeals = useCallback(async (date) => {
    setLoading(true);
    try {
      const dateMeals = await fetchMeals(date);
      setMeals(dateMeals);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: profile + activity + meal dates for calendar dots
  useEffect(() => {
    (async () => {
      try {
        const [serverProfile, cachedActivity] = await Promise.all([
          fetchProfile(),
          getActivityForDate(todayStr),
        ]);
        if (serverProfile) setProfile(p => ({ ...p, ...serverProfile, goal: serverProfile.calorie_goal || p.goal }));
        if (cachedActivity) setActivity(cachedActivity);

        if (connected) {
          try {
            const [stats, weekly] = await Promise.all([fetchTodayStats(), fetchWeeklySteps()]);
            setActivity(stats);
            setWeekData(weekly);
            await saveActivitySnapshot(stats);
          } catch {
            // silently use cached data
          }
        }

        // Fetch last 60 days of meals for calendar dots
        const sixtyAgo = new Date();
        sixtyAgo.setDate(sixtyAgo.getDate() - 60);
        const from = sixtyAgo.toLocaleDateString('en-CA');
        try {
          const rangeMeals = await fetchMealsRange(from, todayStr);
          const dates = new Set(rangeMeals.map(m => m.meal_date?.split('T')[0] || m.meal_date));
          setMealDates(dates);
        } catch { /* ignore */ }
      } catch { /* ignore */ }
    })();
  }, [todayStr, connected]);

  // Load meals when selected date changes
  useEffect(() => {
    loadMeals(selectedDate);
  }, [selectedDate, loadMeals]);

  // Auto-cancel delete confirmation after 2.5s
  useEffect(() => {
    if (confirmDeleteId === null) return;
    const timer = setTimeout(() => setConfirmDeleteId(null), 2500);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  // Date navigation
  const shiftDate = useCallback((days) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const str = d.toLocaleDateString('en-CA');
    // Don't go into the future
    if (str > todayStr) return;
    setSelectedDate(str);
  }, [selectedDate, todayStr]);

  const handleFavorite = useCallback(async (meal) => {
    try {
      const typeStr = meal.meal_type || 'meal';
      const name = meal.items && meal.items.length > 0 
        ? meal.items[0].name 
        : `${typeStr.charAt(0).toUpperCase() + typeStr.slice(1)}`;
      
      await saveFavorite({
        name,
        meal_type: meal.meal_type,
        total_calories: meal.total_calories,
        total_protein: meal.total_protein,
        total_carbs: meal.total_carbs,
        total_fat: meal.total_fat,
        total_fiber: meal.total_fiber,
        notes: meal.items?.map(i => i.name).join(', ') || meal.notes || ''
      });
      showToast('Saved to Favorites! ⭐', 'success');
    } catch (err) {
      showToast('Failed to save favorite', 'error');
    }
  }, [showToast]);

  const handleDelete = useCallback(async (id) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    try {
      await deleteMeal(id);
      setMeals(prev => prev.filter(m => m.id !== id));
      setConfirmDeleteId(null);
      showToast('Meal deleted', 'success');
    } catch {
      showToast('Failed to delete meal', 'error');
    }
  }, [confirmDeleteId, showToast]);

  const openEdit = useCallback((meal) => {
    setEditingMeal(meal);
    setEditForm({
      meal_type: meal.meal_type || 'meal',
      total_calories: meal.total_calories || 0,
      total_protein: meal.total_protein || 0,
      total_carbs: meal.total_carbs || 0,
      total_fat: meal.total_fat || 0,
      total_fiber: meal.total_fiber || 0,
      notes: meal.notes || '',
    });
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingMeal) return;
    setSaving(true);
    try {
      const updated = await updateMeal(editingMeal.id, {
        ...editingMeal,
        ...editForm,
        total_calories: parseInt(editForm.total_calories) || 0,
        total_protein: parseFloat(editForm.total_protein) || 0,
        total_carbs: parseFloat(editForm.total_carbs) || 0,
        total_fat: parseFloat(editForm.total_fat) || 0,
        total_fiber: parseFloat(editForm.total_fiber) || 0,
      });
      setMeals(prev => prev.map(m => m.id === editingMeal.id ? updated : m));
      setEditingMeal(null);
      showToast('Meal updated! ✓', 'success');
    } catch {
      showToast('Failed to update meal', 'error');
    } finally {
      setSaving(false);
    }
  }, [editingMeal, editForm, showToast]);

  const consumed = meals.reduce((s, m) => s + (m.total_calories || 0), 0);
  const burned = isToday ? activity.calories : 0;
  const goal = parseInt(profile.goal) || 2000;

  const totalProtein = meals.reduce((s, m) => s + (m.total_protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.total_carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.total_fat || 0), 0);
  const totalFiber = meals.reduce((s, m) => s + (m.total_fiber || 0), 0);

  const parsedWeight = parseFloat(profile.weight);
  const parsedHeight = parseFloat(profile.height);
  const parsedAge = parseInt(profile.age);
  const isMale = profile.gender !== 'female';
  
  const bmi = (parsedWeight && parsedHeight) ? (parsedWeight / Math.pow(parsedHeight / 100, 2)).toFixed(1) : null;
  const bfp = (bmi && parsedAge) ? ((1.20 * bmi) + (0.23 * parsedAge) - (10.8 * (isMale ? 1 : 0)) - 5.4).toFixed(1) : null;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  const headerTitle = isToday ? "Today's" : dateLabel + "'s";

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="text-muted text-sm">{greeting()}{profile.name ? `, ${profile.name}` : ''} 👋</p>
          <h1 className="mt-2">{headerTitle} <span className="gradient-text">Balance</span></h1>
        </div>
        <LiveClock />
      </div>

      {/* Stats Row */}
      <div className="stats-row mb-4">
        {profile.weight && (
          <div className="glass-card stat-card-mini">
            <div className="text-xs text-muted font-medium mb-1">Weight</div>
            <div className="font-bold gradient-text text-lg">{profile.weight}{String(profile.weight).match(/[a-z]/i) ? '' : ' kg'}</div>
          </div>
        )}
        {bmi && (
          <div className="glass-card stat-card-mini">
            <div className="text-xs text-muted font-medium mb-1">BMI</div>
            <div className="font-bold gradient-text text-lg">{bmi}</div>
          </div>
        )}
        {bfp && (
          <div className="glass-card stat-card-mini">
            <div className="text-xs text-muted font-medium mb-1">Body Fat</div>
            <div className="font-bold gradient-text text-lg">{bfp}%</div>
          </div>
        )}
      </div>

      {/* Date Picker Pill */}
      <div className="date-nav-container mb-4">
        <div className="date-nav">
          <button className="date-arrow" onClick={() => shiftDate(-1)} aria-label="Previous day">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="date-pill" onClick={() => setCalendarOpen(o => !o)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{isToday ? 'Today' : dateLabel}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`date-chevron ${calendarOpen ? 'open' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <button className="date-arrow" onClick={() => shiftDate(1)} disabled={isToday} aria-label="Next day">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {!isToday && (
          <button className="today-btn" onClick={() => setSelectedDate(todayStr)}>
            ↩ Today
          </button>
        )}

        {calendarOpen && (
          <CalendarPicker
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onClose={() => setCalendarOpen(false)}
            mealDates={mealDates}
          />
        )}
      </div>

      {/* Calorie Arc */}
      <div className="glass-card p-6 flex flex-col items-center mb-4">
        <CalorieArc consumed={consumed} goal={goal} />
        <div className="arc-legend">
          <div className="arc-legend-item">
            <span className="arc-legend-dot" style={{ background: 'var(--grad-primary)' }}/>
            <span>Consumed</span>
          </div>
          <div className="arc-legend-item">
            <span className="arc-legend-dot" style={{ background: 'var(--color-border)' }}/>
            <span>Goal {goal} kcal</span>
          </div>
        </div>
      </div>

      {/* Macro Breakdown */}
      <div className="glass-card p-6 mb-4">
        <p className="section-title">Macros</p>
        <div className="flex flex-col gap-3">
          <MacroBar label="Protein" value={Math.round(totalProtein)} max={150} color="var(--grad-primary)"/>
          <MacroBar label="Carbs"   value={Math.round(totalCarbs)}   max={300} color="var(--grad-cool)"/>
          <MacroBar label="Fat"     value={Math.round(totalFat)}     max={80}  color="var(--grad-warm)"/>
          <MacroBar label="Fiber"   value={Math.round(totalFiber)}   max={30}  color="#10b981"/>
        </div>
      </div>

      {/* Activity Stats (only for today) */}
      {isToday && (connected ? (
        <div className="glass-card p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title" style={{ marginBottom: 0 }}>Activity</p>
            <span className="chip chip-green">● Live</span>
          </div>
          <div className="stat-grid">
            <div className="stat-block">
              <div className="stat-value" style={{ color: 'var(--color-secondary)' }}>{activity.steps.toLocaleString()}</div>
              <div className="stat-label">steps</div>
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
      ))}

      {/* Weekly Chart (only for today) */}
      {isToday && weekData.length > 0 && (
        <div className="glass-card p-6 mb-4">
          <p className="section-title">7-Day Steps</p>
          <WeekChart data={weekData} />
        </div>
      )}

      {/* Meals */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title" style={{ marginBottom: 0 }}>Meals</p>
          <Link to="/log-meal" className="btn btn-sm btn-ghost">+ Add</Link>
        </div>

        {loading ? (
          <div className="flex justify-center p-4"><div className="spinner"/></div>
        ) : meals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <p>No meals logged{isToday ? ' yet' : ''}</p>
            {isToday && <Link to="/log-meal" className="btn btn-primary btn-sm mt-4">Log First Meal</Link>}
          </div>
        ) : (
          <div className="meal-list">
            {meals.map(meal => (
              <div key={meal.id} className="meal-item-wrapper">
                <div className="meal-item">
                  {meal.imageUrl && (
                    <img src={meal.imageUrl} alt={meal.meal_type || 'meal'} className="meal-thumb"/>
                  )}
                  <div className="meal-info">
                    <p className="font-semibold">
                      {meal.items && meal.items.length > 0
                        ? meal.items.slice(0, 2).map(i => i.name).join(', ') + (meal.items.length > 2 ? ` +${meal.items.length - 2} more` : '')
                        : meal.notes || (meal.meal_type ? meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1) : 'Meal')
                      }
                    </p>
                    <p className="text-muted text-sm">
                      {meal.meal_type
                        ? meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)
                        : 'Meal'}
                    </p>
                  </div>
                  <div className="meal-cal">
                    <span className="gradient-text font-bold">{meal.total_calories}</span>
                    <span className="text-xs text-muted">kcal</span>
                  </div>
                </div>
                <div className="meal-actions">
                  <button
                    className="meal-action-btn"
                    onClick={() => handleFavorite(meal)}
                    title="Save to Favorites"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </button>
                  <button
                    className="meal-action-btn meal-action-edit"
                    onClick={() => openEdit(meal)}
                    title="Edit meal"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className={`meal-action-btn meal-action-delete ${confirmDeleteId === meal.id ? 'confirming' : ''}`}
                    onClick={() => handleDelete(meal.id)}
                    title={confirmDeleteId === meal.id ? 'Tap again to confirm' : 'Delete meal'}
                  >
                    {confirmDeleteId === meal.id ? (
                      <span className="delete-confirm-text">Confirm?</span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Meal Modal */}
      {editingMeal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setEditingMeal(null)}>
          <div className="modal-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"/>
            <h3 className="modal-title">Edit Meal</h3>

            <div className="modal-form">
              <div className="input-group">
                <label className="input-label">Meal Type</label>
                <select
                  className="input"
                  value={editForm.meal_type}
                  onChange={e => setEditForm(f => ({ ...f, meal_type: e.target.value }))}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                  <option value="meal">Other</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Calories (kcal)</label>
                <input
                  type="number"
                  className="input"
                  value={editForm.total_calories}
                  onChange={e => setEditForm(f => ({ ...f, total_calories: e.target.value }))}
                />
              </div>

              <div className="modal-macro-grid">
                <div className="input-group">
                  <label className="input-label">Protein (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={editForm.total_protein}
                    onChange={e => setEditForm(f => ({ ...f, total_protein: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Carbs (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={editForm.total_carbs}
                    onChange={e => setEditForm(f => ({ ...f, total_carbs: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Fat (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={editForm.total_fat}
                    onChange={e => setEditForm(f => ({ ...f, total_fat: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Fiber (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={editForm.total_fiber}
                    onChange={e => setEditForm(f => ({ ...f, total_fiber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Notes</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Optional notes..."
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost w-full" onClick={() => setEditingMeal(null)}>Cancel</button>
              <button className="btn btn-primary w-full" onClick={handleEditSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
