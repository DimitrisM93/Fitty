import { NavLink } from 'react-router-dom';
import './BottomNav.css';

export default function BottomNav({ onOpenMenu }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button className="bottom-nav-menu-btn" onClick={onOpenMenu} aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div className="bottom-nav-center">
        <NavLink
          to="/log-meal"
          className="nav-fab"
          aria-label="Log Meal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </NavLink>
      </div>
      
      {/* Spacer to balance the flex layout */}
      <div className="bottom-nav-spacer"></div>
    </nav>
  );
}
