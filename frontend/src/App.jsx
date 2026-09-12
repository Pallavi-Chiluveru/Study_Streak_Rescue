import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/authContext.js';
import { ToastProvider } from './context/ToastContext';
import { destinationAfterAuth } from './utils/authRouting';

// Components & Layout
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import MobileNavigation from './components/layout/MobileNavigation';
import LightningBackground from './components/ui/LightningBackground';

// Pages
import LandingPage from './pages/LandingPage';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PlansPage from './pages/PlansPage';
import PlanDetailsPage from './pages/PlanDetailsPage';
import CreatePlanWizard from './components/plans/CreatePlanWizard';
import TodayPage from './pages/TodayPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AchievementsPage from './pages/AchievementsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import GoalsPage from './pages/GoalsPage';
import GoalOnboardingPage from './pages/GoalOnboardingPage';

// Protected App Layout Wrapper
const ProtectedAppLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-orange-600 dark:text-orange-400 font-mono text-sm">
        Initializing Study Streak Rescue...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell min-h-screen bg-[#F6F8FA] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 flex relative overflow-x-hidden">
      <LightningBackground intensity="subtle" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-5 sm:p-8 max-w-[1400px] w-full mx-auto relative z-10">
          <Outlet />
        </main>
        <MobileNavigation />
      </div>
    </div>
  );
};

// Public Route Guard (Redirect logged-in users away from auth pages)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={destinationAfterAuth(user)} replace />;
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public Landing & Auth Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            {/* Protected App Routes */}
            <Route element={<ProtectedAppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/onboarding/goals" element={<GoalOnboardingPage />} />
              <Route path="/goals/setup" element={<Navigate to="/onboarding/goals" replace />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/plans/new" element={<CreatePlanWizard />} />
              <Route path="/plans/:id" element={<PlanDetailsPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch All Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
