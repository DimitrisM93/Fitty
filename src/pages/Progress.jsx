import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { fetchWeightLogs, saveWeightLogApi, deleteWeightLogApi, fetchProfile } from '../services/api';
import { getUserProfile } from '../services/storage';
import { getLocalISODate } from '../services/dateUtils';
import { useToast } from '../context/ToastContext';
import './Progress.css';

function calculateMetrics(weightVal, profile) {
  if (!weightVal || !profile) return { bmi: null, bfp: null };
  const w = parseFloat(weightVal);
  const h = parseFloat(profile.height);
  const age = parseInt(profile.age);
  const isMale = profile.gender !== 'female';

  if (!w || !h) return { bmi: null, bfp: null };
  const bmiVal = w / Math.pow(h / 100, 2);
  const bmiStr = bmiVal.toFixed(1);

  let bfpStr = null;
  if (age) {
    const bfpVal = (1.20 * bmiVal) + (0.23 * age) - (10.8 * (isMale ? 1 : 0)) - 5.4;
    bfpStr = bfpVal.toFixed(1);
  }

  return { bmi: bmiStr, bfp: bfpStr };
}

function CustomTooltip({ active, payload, profile }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const { bmi, bfp } = calculateMetrics(d.weight, profile);
  return (
    <div className="weight-tooltip">
      <div className="weight-tooltip-date">{d.label}</div>
      <div className="weight-tooltip-value">{d.weight} kg</div>
      {(bmi || bfp) && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
          {bmi && <span>BMI: <b style={{ color: 'white' }}>{bmi}</b></span>}
          {bfp && <span>Fat: <b style={{ color: 'white' }}>{bfp}%</b></span>}
        </div>
      )}
    </div>
  );
}

function formatLogDate(rawDate, options) {
  if (!rawDate) return '';
  const dateStr = String(rawDate).split('T')[0];
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en', options);
}

export default function Progress() {
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(getUserProfile);
  const [date, setDate] = useState(getLocalISODate(new Date()));
  const [weight, setWeight] = useState('');
  const showToast = useToast();

  useEffect(() => {
    Promise.all([
      fetchWeightLogs().catch(() => []),
      fetchProfile().catch(() => null),
    ]).then(([logsData, profileData]) => {
      setLogs(logsData);
      if (profileData) setProfile(p => ({ ...p, ...profileData }));
    });
  }, []);

  const handleAdd = async () => {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 300) {
      showToast('Enter a valid weight (20–300 kg)', 'error');
      return;
    }
    if (!date) {
      showToast('Please select a date', 'error');
      return;
    }
    try {
      await saveWeightLogApi(date, w);
      const updated = await fetchWeightLogs();
      setLogs(updated);
      setWeight('');
      showToast('Weight logged ✓', 'success');
    } catch {
      showToast('Failed to save. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWeightLogApi(id);
      const updated = await fetchWeightLogs();
      setLogs(updated);
      showToast('Entry removed', 'success');
    } catch {
      showToast('Failed to delete.', 'error');
    }
  };

  // Prepare chart data — format dates for display
  const chartData = logs.map(l => ({
    ...l,
    weight: parseFloat(l.weight),
    label: formatLogDate(l.log_date || l.date, { month: 'short', day: 'numeric' }),
  }));

  // Stats
  const weights = logs.map(l => parseFloat(l.weight));
  const current = weights.length > 0 ? weights[weights.length - 1] : null;
  const lowest = weights.length > 0 ? Math.min(...weights) : null;
  const change = weights.length >= 2 ? (weights[weights.length - 1] - weights[0]).toFixed(1) : null;

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1><span className="gradient-text">Progress</span></h1>
        <p className="text-muted text-sm mt-2">Track your weight journey</p>
      </div>

      {/* Log Entry Form */}
      <div className="glass-card p-6 mb-4">
        <p className="section-title">Log Weight</p>
        <div className="progress-form">
          <div className="input-group">
            <label className="input-label" htmlFor="progress-date">Date</label>
            <input
              id="progress-date"
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="progress-weight">Weight (kg)</label>
            <input
              id="progress-weight"
              type="number"
              className="input"
              placeholder="75.0"
              step="0.1"
              min="20"
              max="300"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
        </div>
      </div>

      {/* Stats */}
      {logs.length > 0 && (
        <div className="glass-card p-6 mb-4">
          <p className="section-title">Overview</p>
          <div className="weight-stats">
            <div className="weight-stat">
              <div className="weight-stat-value gradient-text">{current}</div>
              <div className="weight-stat-label">Current (kg)</div>
            </div>
            <div className="weight-stat">
              <div className="weight-stat-value" style={{ color: '#10b981' }}>{lowest}</div>
              <div className="weight-stat-label">Lowest (kg)</div>
            </div>
            <div className="weight-stat">
              <div className="weight-stat-value" style={{ color: change !== null && parseFloat(change) <= 0 ? '#10b981' : 'var(--color-accent)' }}>
                {change !== null ? (parseFloat(change) > 0 ? '+' : '') + change : '–'}
              </div>
              <div className="weight-stat-label">Change (kg)</div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {logs.length >= 2 ? (
        <div className="glass-card p-6 mb-4">
          <p className="section-title">Weight Trend</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${v}`}
                />
                <Tooltip content={<CustomTooltip profile={profile} />} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="url(#weightLineGrad)"
                  fill="url(#weightGrad)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#6ee7b7', stroke: '#1a1a2e', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#818cf8', stroke: '#fff', strokeWidth: 2 }}
                />
                <defs>
                  <linearGradient id="weightLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6ee7b7" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : logs.length === 1 ? (
        <div className="glass-card p-6 mb-4">
          <div className="progress-empty">
            <div className="progress-empty-icon">📈</div>
            <p>Add at least one more entry to see your chart</p>
          </div>
        </div>
      ) : null}

      {/* History */}
      <div className="glass-card p-6 mb-4">
        <p className="section-title">History</p>
        {logs.length === 0 ? (
          <div className="progress-empty">
            <div className="progress-empty-icon">⚖️</div>
            <p>No weigh-ins yet. Add your first one above!</p>
          </div>
        ) : (
          <div className="weight-history">
            {[...logs].reverse().map(entry => {
              const { bmi, bfp } = calculateMetrics(entry.weight, profile);
              return (
                <div key={entry.id} className="weight-entry">
                  <div className="weight-entry-info">
                    <div className="weight-entry-icon">⚖️</div>
                    <div className="weight-entry-text-container">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="weight-entry-value gradient-text">{entry.weight} kg</span>
                        {bmi && <span className="chip chip-violet" style={{ fontSize: '11px', padding: '2px 8px' }}>BMI {bmi}</span>}
                        {bfp && <span className="chip chip-orange" style={{ fontSize: '11px', padding: '2px 8px' }}>Fat {bfp}%</span>}
                      </div>
                      <div className="weight-entry-date" style={{ marginTop: '2px' }}>
                        {formatLogDate(entry.log_date || entry.date, {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    className="weight-entry-delete"
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Delete entry"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
