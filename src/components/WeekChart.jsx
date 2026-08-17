import { useState } from 'react';

export default function WeekChart({ data }) {
  const [activeIdx, setActiveIdx] = useState(null);
  
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.steps), 1);

  return (
    <div className="week-chart">
      {data.map((d, i) => (
        <div 
          key={i} 
          className="week-bar-col" 
          onClick={() => setActiveIdx(activeIdx === i ? null : i)}
          style={{ cursor: 'pointer' }}
        >
          <div className="week-bar-track">
            <div
              className="week-bar-fill"
              style={{ 
                height: `${(d.steps / max) * 100}%`, 
                background: 'var(--color-secondary)',
                opacity: activeIdx !== null && activeIdx !== i ? 0.5 : 1,
                transition: 'opacity 0.2s ease, height 1s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>
          <span className="week-bar-label" style={{ fontWeight: activeIdx === i ? 'bold' : 'normal' }}>
            {d.date}
          </span>
          <span className="week-bar-val" style={{ 
            fontSize: activeIdx === i ? '0.75rem' : '0.7rem',
            color: activeIdx === i ? 'var(--text-main)' : 'var(--text-muted)' 
          }}>
            {activeIdx === i 
              ? d.steps.toLocaleString() 
              : (d.steps >= 1000 ? (d.steps / 1000).toFixed(1) + 'k' : d.steps)}
          </span>
        </div>
      ))}
    </div>
  );
}
