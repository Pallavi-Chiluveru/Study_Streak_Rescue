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
      className={`relative rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-xl transition-all duration-300 p-6 ${
        rescueAlert
          ? 'border-red-500/60 shadow-red-950/40 animate-rescue-pulse'
          : glowing
          ? 'border-orange-500/50 shadow-orange-950/30 animate-border-flow'
          : 'hover:border-orange-200 dark:hover:border-orange-500/30 hover:shadow-orange-100/50 dark:hover:shadow-orange-950/20 hover:-translate-y-1'
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
