import React from 'react';
import { Zap } from 'lucide-react';

const ElectricButton = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  subtitle,
  icon: Icon = Zap,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) => {
  const baseStyles = 'relative inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
    rescue: 'px-8 py-4 text-lg gap-3 rounded-2xl'
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:shadow-xl border border-orange-400/40',
    secondary: 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 shadow-md',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 border border-emerald-400/30',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-900/30 border border-red-400/30',
    rescue: 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:via-orange-500 hover:to-amber-400 text-white shadow-2xl shadow-orange-900/30 hover:shadow-orange-600/50 border-2 border-orange-400/60 animate-rescue-pulse'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[variant === 'rescue' ? 'rescue' : size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {/* Moving energy highlight on hover */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 animate-energy-flow pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${variant === 'rescue' ? 'w-6 h-6 text-yellow-300 animate-lightning' : ''}`} />}
          <span>{children}</span>
        </div>
        {subtitle && (
          <span className="text-xs font-normal opacity-85 mt-0.5 tracking-wide text-orange-100">
            {subtitle}
          </span>
        )}
      </div>
    </button>
  );
};

export default ElectricButton;
