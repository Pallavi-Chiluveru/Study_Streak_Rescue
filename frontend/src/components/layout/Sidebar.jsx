import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, CheckSquare, BarChart3, Award, LogOut, Zap, Target } from 'lucide-react';
import { useAuth } from '../../context/authContext.js';
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
    { label: 'My Goals', path: '/goals', icon: Target },
    { label: 'Today Focus', path: '/today', icon: CheckSquare },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Achievements', path: '/achievements', icon: Award },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 backdrop-blur-md min-h-screen sticky top-0 z-40 p-4 justify-between transition-colors duration-300">
      <div>
        {/* Brand Logo */}
        <div className="flex flex-col items-center justify-center px-4 py-6 mb-6 border-b border-slate-200 dark:border-slate-800/80">
          <BrandLogo compact />
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
                  `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm md:text-base font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${isActive
                    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 font-semibold shadow-sm shadow-orange-100/50 dark:shadow-orange-950/20'
                    : 'text-slate-700 dark:text-slate-400 hover:text-orange-700 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-orange-500/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-500'}`} />
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
          <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-400/50 flex items-center justify-center text-orange-700 dark:text-orange-300 font-bold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name || 'Learner'}</p>
            <p className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 truncate font-mono"><Zap aria-hidden="true" className="h-3.5 w-3.5 text-orange-500" />{user?.xp || 0} XP</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;


