import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/40 shadow-md ${isDark
          ? 'bg-slate-900/80 border-slate-800 text-amber-400 hover:text-amber-300 hover:border-slate-700 hover:shadow-amber-500/10'
          : 'bg-white border-slate-200 text-slate-700 hover:text-orange-700 hover:border-orange-300 hover:bg-orange-50 hover:shadow-orange-500/10'
        } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Sun Icon (Shown in Dark Mode to switch to Light Mode) */}
        <Sun
          className={`w-5 h-5 absolute transition-all duration-300 transform ${isDark
              ? 'rotate-0 scale-100 opacity-100 text-amber-400'
              : '-rotate-90 scale-0 opacity-0 text-amber-500'
            }`}
        />
        {/* Moon Icon (Shown in Light Mode to switch to Dark Mode) */}
        <Moon
          className={`w-5 h-5 absolute transition-all duration-300 transform ${isDark
              ? 'rotate-90 scale-0 opacity-0 text-slate-400'
              : 'rotate-0 scale-100 opacity-100 text-orange-600'
            }`}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
