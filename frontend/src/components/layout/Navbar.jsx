import React, { useState } from 'react';
import { Bell, Flame, Zap, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ElectricButton from '../ui/ElectricButton';
import ThemeToggle from '../ui/ThemeToggle';

const Navbar = ({ onOpenMobileMenu }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Good Day, {user?.name ? user.name.split(' ')[0] : 'Learner'} 👋
        </h2>
        <p className="text-xs text-slate-400">Let's keep your study momentum alive.</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Streak Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold">
          <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-bounce" />
          <span>{user?.streak || 0} Day Streak</span>
        </div>

        {/* Quick XP Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold">
          <Zap className="w-4 h-4 text-orange-500 animate-lightning" />
          <span>{user?.xp || 0} XP</span>
        </div>

        {/* Create Plan Button */}
        <ElectricButton
          variant="primary"
          size="sm"
          onClick={() => navigate('/plans/new')}
          icon={Plus}
        >
          New Plan
        </ElectricButton>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:text-orange-700 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/30 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-400 animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white mb-2">
                <span>Notifications</span>
                <span className="text-[10px] text-orange-500 font-mono">Live AI Engine</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-800 dark:text-orange-200">
                  <p className="font-semibold text-orange-600 dark:text-orange-300">⚡ Adaptive Scheduling Ready</p>
                  <p className="text-[11px] opacity-80 mt-0.5">If you ever miss a task, click Rescue My Plan to recover instantly.</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
