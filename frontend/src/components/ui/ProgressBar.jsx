import React from 'react';

const ProgressBar = ({ value = 0, max = 100, height = 'h-2.5', showText = false, color = 'violet', className = '' }) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const colorStyles = {
    violet: 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-orange-500/30',
    cyan: 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-orange-500/30',
    emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/50',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/50',
    danger: 'bg-gradient-to-r from-red-600 to-orange-600 shadow-red-500/50'
  };

  return (
    <div className={`w-full ${className}`}>
      {showText && (
        <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">
          <span>Progress</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 p-0.5 ${height}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${colorStyles[color] || colorStyles.violet}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
