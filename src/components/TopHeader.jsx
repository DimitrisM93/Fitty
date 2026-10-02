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
          aria-label="Go to Vylia Dashboard"
        >
          <div className="favicon-icon-wrapper">
            <img src="/favicon.png" alt="Vylia Favicon" className="favicon-img" />
          </div>
          <span className="brand-title font-bold">
            Vy<span className="gradient-text">lia</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
