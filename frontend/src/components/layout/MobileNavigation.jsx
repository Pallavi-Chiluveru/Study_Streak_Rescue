import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, CheckSquare, BarChart3, Award, Plus } from 'lucide-react';

const MobileNavigation = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Plans', path: '/plans', icon: Calendar },
    { label: 'Create', path: '/plans/new', icon: Plus, isCta: true },
    { label: 'Today', path: '/today', icon: CheckSquare },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-lg px-4 py-2 transition-colors duration-300">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isCta) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center -mt-6 w-12 h-12 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-900/50 border-2 border-white dark:border-slate-950"
              >
                <Icon className="w-6 h-6" />
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-orange-400' : 'text-slate-400'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigation;
