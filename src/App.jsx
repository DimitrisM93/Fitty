import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import LogMeal from './pages/LogMeal';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import PinGate from './pages/PinGate';
import { isAuthenticated } from './services/api';

export default function App() {
  const [unlocked, setUnlocked] = useState(isAuthenticated);

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <ToastProvider>
      <main>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/log-meal"  element={<LogMeal />} />
          <Route path="/activity"  element={<Activity />} />
          <Route path="/settings"  element={<Settings />} />
        </Routes>
      </main>
      <BottomNav />
    </ToastProvider>
  );
}
