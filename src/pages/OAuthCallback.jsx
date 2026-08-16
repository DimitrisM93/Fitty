import React from 'react';

export default function OAuthCallback() {
  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0F172A', color: '#F8FAFC' }}>
      <div style={{ marginBottom: '1rem', width: '32px', height: '32px', border: '3px solid #334155', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ fontWeight: '500' }}>Connecting to Google Fit...</p>
      <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: '0.5rem' }}>This window will close automatically.</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
