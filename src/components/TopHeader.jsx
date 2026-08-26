import { Link, useLocation } from 'react-router-dom';
import './TopHeader.css';

export default function TopHeader() {
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <header className="top-header">
      <div className="top-header-content">
        <Link
          to="/"
          className={`favicon-logo-btn ${isDashboard ? 'active' : ''}`}
          title="Quick go to Dashboard"
          aria-label="Go to FitAI Dashboard"
        >
          <div className="favicon-icon-wrapper">
            <img src="/favicon.png" alt="FitAI Favicon" className="favicon-img" />
          </div>
          <span className="brand-title font-bold">
            Fit<span className="gradient-text">AI</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
