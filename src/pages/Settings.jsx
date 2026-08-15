import { useState } from 'react';
import { getUserProfile, setUserProfile } from '../services/storage';
import { isConnected, connectGoogleFit, disconnectGoogleFit } from '../services/googleFit';
import { clearAuthToken } from '../services/api';
import { useToast } from '../context/ToastContext';
import './Settings.css';

export default function Settings() {
  const [profile, setProfile]       = useState(getUserProfile);
  const [connected, setConnected]   = useState(isConnected);
  const [connecting, setConnecting] = useState(false);
  const showToast = useToast();

  const lockApp = () => {
    clearAuthToken();
    window.location.reload();
  };

  const saveProfile = () => {
    setUserProfile(profile);
    showToast('Profile saved ✓', 'success');
  };

  const handleConnectFit = async () => {
    setConnecting(true);
    try {
      await connectGoogleFit();
      setConnected(true);
      showToast('Google Fit connected ✓', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectFit = () => {
    disconnectGoogleFit();
    setConnected(false);
    showToast('Disconnected from Google Fit', 'success');
  };

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1><span className="gradient-text">Settings</span></h1>
        <p className="text-muted text-sm mt-2">Configure your API keys and profile</p>
      </div>

      {/* AI — server-managed */}
      <section className="settings-section glass-card p-6 mb-4">
        <div className="settings-section-header">
          <div className="settings-icon gemini-icon">✨</div>
          <div>
            <h3>Gemini AI</h3>
            <p className="text-muted text-sm">Powered by your server</p>
          </div>
        </div>
        <div className="settings-help mt-4">
          <p className="text-xs text-muted">
            Your Gemini API key is securely stored on the server in <code>.env</code>.
            It is never exposed to the browser. Meal analysis calls are proxied through your backend.
          </p>
        </div>
        <div className="connected-status mt-4">
          <span className="chip chip-green">● Key configured server-side</span>
        </div>
      </section>

      {/* Lock App */}
      <section className="settings-section glass-card p-6 mb-4">
        <div className="settings-section-header">
          <div className="settings-icon" style={{ background: 'rgba(248,113,113,0.12)' }}>🔒</div>
          <div>
            <h3>Lock App</h3>
            <p className="text-muted text-sm">Require PIN on next open</p>
          </div>
        </div>
        <button
          id="lock-app-btn"
          onClick={lockApp}
          className="btn btn-ghost w-full mt-4"
        >
          Lock &amp; Sign Out
        </button>
      </section>

      {/* Google Fit Connection */}
      <section className="settings-section glass-card p-6 mb-4">
        <div className="settings-section-header">
          <div className="settings-icon watch-icon">⌚</div>
          <div>
            <h3>Google Fit / Xiaomi Watch</h3>
            <p className="text-muted text-sm">Calorie burn & activity tracking</p>
          </div>
        </div>

        {connected ? (
          <div className="mt-4">
            <div className="connected-status">
              <span className="chip chip-green">● Connected</span>
              <span className="text-sm text-muted">Google Fit is authorized</span>
            </div>
            <div className="settings-help mt-3">
              <p className="text-xs text-muted">
                Your Xiaomi Watch 2 syncs to Google Fit automatically via the Mi Fitness app.
              </p>
            </div>
            <button
              id="disconnect-fit-btn"
              onClick={handleDisconnectFit}
              className="btn btn-ghost w-full mt-4"
            >
              Disconnect Google Fit
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="settings-help mb-4">
              <div className="setup-note">
                <p className="text-xs font-semibold mb-2">⚙️ One-time setup required</p>
                <ol className="setup-list text-xs text-muted">
                  <li>Create a project at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="settings-link">console.cloud.google.com</a></li>
                  <li>Enable <strong>Fitness API</strong></li>
                  <li>Create OAuth 2.0 credentials (Web app)</li>
                  <li>Add your domain to authorized origins</li>
                  <li>Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code></li>
                </ol>
              </div>
            </div>
            <button
              id="connect-fit-settings-btn"
              onClick={handleConnectFit}
              disabled={connecting}
              className="btn btn-secondary w-full"
            >
              {connecting
                ? <><div className="spinner" style={{ width: 16, height: 16 }}/> Connecting…</>
                : 'Connect Google Fit'
              }
            </button>
          </div>
        )}
      </section>

      {/* User Profile */}
      <section className="settings-section glass-card p-6 mb-4">
        <div className="settings-section-header">
          <div className="settings-icon profile-icon">👤</div>
          <div>
            <h3>Your Profile</h3>
            <p className="text-muted text-sm">Used for calorie goal calculation</p>
          </div>
        </div>

        <div className="profile-grid mt-4">
          <div className="input-group">
            <label className="input-label" htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              className="input"
              placeholder="Your name"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="profile-age">Age</label>
            <input
              id="profile-age"
              type="number"
              className="input"
              placeholder="25"
              min="10"
              max="120"
              value={profile.age}
              onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="profile-weight">Weight (kg)</label>
            <input
              id="profile-weight"
              type="number"
              className="input"
              placeholder="70"
              value={profile.weight}
              onChange={e => setProfile(p => ({ ...p, weight: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="profile-height">Height (cm)</label>
            <input
              id="profile-height"
              type="number"
              className="input"
              placeholder="175"
              value={profile.height}
              onChange={e => setProfile(p => ({ ...p, height: e.target.value }))}
            />
          </div>
        </div>

        <div className="input-group mt-4">
          <label className="input-label" htmlFor="profile-goal">Daily Calorie Goal (kcal)</label>
          <input
            id="profile-goal"
            type="number"
            className="input"
            placeholder="2000"
            min="1000"
            max="5000"
            value={profile.goal}
            onChange={e => setProfile(p => ({ ...p, goal: e.target.value }))}
          />
        </div>

        <button
          id="save-profile-btn"
          onClick={saveProfile}
          className="btn btn-primary w-full mt-4"
        >
          Save Profile
        </button>
      </section>

      {/* About */}
      <section className="glass-card p-6 mb-4">
        <div className="about-header">
          <span className="about-logo">⚡</span>
          <div>
            <h3>FitAI</h3>
            <p className="text-xs text-muted">v1.0.0 · Built with Gemini AI</p>
          </div>
        </div>
        <p className="text-xs text-muted mt-4">
          Your data stays on your device. API keys are stored in your browser's local storage and never sent to any server other than Google and Gemini APIs.
        </p>
      </section>
    </div>
  );
}
