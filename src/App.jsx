import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import SidebarMenu from './components/SidebarMenu';
import Dashboard from './pages/Dashboard';
import LogMeal from './pages/LogMeal';
import Activity from './pages/Activity';
import Progress from './pages/Progress';
import Overview from './pages/Overview';
import Settings from './pages/Settings';
import PinGate from './pages/PinGate';
import OAuthCallback from './pages/OAuthCallback';
import { isAuthenticated } from './services/api';

export default function App() {
  const [unlocked, setUnlocked] = useState(isAuthenticated);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <ToastProvider>
      <TopHeader />
      <main>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/log-meal"  element={<LogMeal />} />
          <Route path="/activity"  element={<Activity />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/settings"  element={<Settings />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
        </Routes>
      </main>
      <SidebarMenu isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <BottomNav onOpenMenu={() => setIsSidebarOpen(true)} />
    </ToastProvider>
  );
}
