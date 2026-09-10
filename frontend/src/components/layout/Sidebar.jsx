import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, CheckSquare, BarChart3, Award, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../ui/BrandLogo';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Plans', path: '/plans', icon: Calendar },
    { label: 'Today Focus', path: '/today', icon: CheckSquare },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Achievements', path: '/achievements', icon: Award },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md min-h-screen sticky top-0 z-40 p-4 justify-between transition-colors duration-300">
      <div>
        {/* Brand Logo */}
        <div className="px-3 py-4 mb-6 border-b border-slate-200 dark:border-slate-800/80">
          <BrandLogo compact />
          <p className="mt-3 text-[10px] uppercase tracking-wider text-orange-500 dark:text-orange-400 font-mono font-medium">
            Self-Healing Planner
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 shadow-md shadow-orange-100/50 dark:shadow-orange-950/20'
                      : 'text-slate-500 dark:text-slate-400 hover:text-orange-700 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <Zap className="w-3.5 h-3.5 text-orange-500 animate-lightning" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Logout Bottom Section */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-400/50 flex items-center justify-center text-orange-700 dark:text-orange-300 font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Learner'}</p>
            <p className="text-[11px] text-slate-400 truncate font-mono">⚡ {user?.xp || 0} XP</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
