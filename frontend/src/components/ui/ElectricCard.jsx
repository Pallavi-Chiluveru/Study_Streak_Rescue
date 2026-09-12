import React from 'react';

const ElectricCard = ({
  children,
  className = '',
  glowing = false,
  rescueAlert = false,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`electric-card-surface relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.06)] dark:shadow-xl transition-all duration-300 p-6 ${rescueAlert
        ? 'border-red-500/60 shadow-red-950/40 animate-rescue-pulse'
        : glowing
          ? 'border-orange-500/50 shadow-orange-950/30 animate-border-flow'
          : 'hover:border-orange-200 dark:hover:border-orange-500/30 hover:shadow-[0_8px_22px_rgba(15,23,42,0.10)] dark:hover:shadow-orange-950/20 hover:-translate-y-1'
        } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {/* Subtle top electric line highlight */}
      <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-orange-400/25 to-transparent pointer-events-none" />

      {children}
    </div>
  );
};

export default ElectricCard;
