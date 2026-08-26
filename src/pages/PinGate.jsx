import { useState, useRef, useEffect } from 'react';
import { verifyPin } from '../services/api';
import './PinGate.css';

export default function PinGate({ onUnlock }) {
  const [pinLength, setPinLength] = useState(4); // will update from server
  const [digits, setDigits]       = useState(Array(4).fill(''));
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [shake, setShake]         = useState(false);
  const [locked, setLocked]       = useState(false); // rate-limited
  const inputRefs                 = useRef(Array(4).fill(null));

  // Fetch PIN length from server on mount
  useEffect(() => {
    fetch('/api/auth/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.pinLength) {
          const len = data.pinLength;
          setPinLength(len);
          setDigits(Array(len).fill(''));
          inputRefs.current = Array(len).fill(null);
        }
      })
      .catch(() => {
        // Fallback if server unreachable
        setDigits(Array(4).fill(''));
        inputRefs.current = Array(4).fill(null);
      });
  }, []);

  // Focus first input once digits are initialized
  useEffect(() => {
    if (digits.length > 0) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [digits.length]);

  const handleDigit = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');

    if (value && index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (value && index === pinLength - 1) {
      const pin = next.join('');
      if (pin.length === pinLength) submit(pin);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const pin = digits.join('');
      if (pin.length > 0) submit(pin);
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, pinLength);
    if (text.length === pinLength) {
      setDigits(text.split(''));
      submit(text);
    }
  };

  const submit = async (pin) => {
    if (locked) return;
    setLoading(true);
    setError('');
    try {
      await verifyPin(pin);
      onUnlock();
    } catch (err) {
      const msg = err.message || 'Incorrect PIN';
      const isRateLimited = msg.toLowerCase().includes('too many');
      if (isRateLimited) {
        setLocked(true);
        setError(msg);
      } else {
        setError(msg);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setDigits(Array(pinLength).fill(''));
          inputRefs.current[0]?.focus();
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  if (digits.length === 0) {
    return (
      <div className="pin-gate">
        <div className="pin-bg-glow pin-bg-glow--1"/>
        <div className="pin-bg-glow pin-bg-glow--2"/>
        <div className="pin-card">
          <div className="pin-logo">⚡</div>
          <div className="spinner" style={{ marginTop: '1rem' }}/>
        </div>
      </div>
    );
  }

  return (
    <div className="pin-gate">
      <div className="pin-bg-glow pin-bg-glow--1"/>
      <div className="pin-bg-glow pin-bg-glow--2"/>

      <div className="pin-card">
        <div className="pin-logo">⚡</div>
        <h1 className="pin-title">
          <span className="gradient-text">FitAI</span>
        </h1>
        <p className="pin-subtitle">Enter your PIN to continue</p>

        {locked ? (
          <div className="pin-locked animate-fade-in">
            <div className="pin-locked-icon">🔒</div>
            <p className="pin-error">{error}</p>
            <p className="text-xs text-muted" style={{ marginTop: '8px' }}>
              Come back in 15 minutes and try again.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`pin-inputs ${shake ? 'pin-shake' : ''} ${pinLength > 6 ? 'pin-inputs--compact' : ''}`}
              onPaste={handlePaste}
            >
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => (inputRefs.current[i] = el)}
                  id={`pin-digit-${i}`}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  className={`pin-digit ${d ? 'pin-digit--filled' : ''} ${pinLength > 6 ? 'pin-digit--sm' : ''}`}
                  value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  aria-label={`PIN digit ${i + 1}`}
                  disabled={loading}
                />
              ))}
            </div>

            {error && <p className="pin-error animate-fade-in">{error}</p>}

            {loading && (
              <div className="pin-loading">
                <div className="spinner"/>
                <span className="text-sm text-muted">Verifying…</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <button 
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: '200px' }}
                onClick={() => submit(digits.join(''))}
                disabled={!digits.some(d => d) || loading}
              >
                Unlock
              </button>
            </div>
          </>
        )}

        <p className="pin-hint">Your personal fitness companion 🏃</p>
      </div>
    </div>
  );
}
