import React from 'react';
import { Heart, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import ElectricButton from './ElectricButton';

const PlanHealth = ({ score = 100, onRescueClick, compact = false, showButton = true }) => {
  let status = 'Excellent';
  let color = 'text-emerald-400';
  let bgGradient = 'from-emerald-500/20 to-teal-500/10';
  let borderColor = 'border-emerald-500/30';
  let Icon = ShieldCheck;

  if (score >= 90) {
    status = 'Excellent';
    color = 'text-emerald-400';
    bgGradient = 'from-emerald-500/20 to-teal-500/10';
    borderColor = 'border-emerald-500/30';
  } else if (score >= 70) {
    status = 'On Track';
    color = 'text-emerald-400';
    bgGradient = 'from-emerald-500/20 to-green-500/10';
    borderColor = 'border-emerald-500/30';
  } else if (score >= 50) {
    status = 'At Risk';
    color = 'text-amber-400';
    bgGradient = 'from-amber-500/20 to-orange-500/10';
    borderColor = 'border-amber-500/40';
    Icon = AlertTriangle;
  } else {
    status = 'Rescue Recommended';
    color = 'text-red-400';
    bgGradient = 'from-red-600/30 via-orange-600/20 to-amber-600/20';
    borderColor = 'border-red-500/60';
    Icon = Zap;
  }

  const isRescueNeeded = score < 50;
  const statusBadgeClass = isRescueNeeded
    ? 'bg-red-500/15 border-red-300/25 text-red-200'
    : `bg-transparent ${borderColor} ${color}`;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderColor} bg-slate-900/80 backdrop-blur-md`}>
        <Heart className={`w-3.5 h-3.5 ${color} ${isRescueNeeded ? 'animate-bounce' : ''}`} />
        <span className={`text-xs font-semibold ${color}`}>{score}%</span>
        <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">{status}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 ${isRescueNeeded
        ? 'border-[rgba(251,146,60,0.28)] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_28%),linear-gradient(135deg,#5A4D56_0%,#4A4454_40%,#3F4658_100%)] shadow-[0_12px_28px_rgba(249,115,22,0.18),0_4px_14px_rgba(239,68,68,0.08)]'
        : `bg-gradient-to-br ${bgGradient} ${borderColor}`
        }`}
    >
      {isRescueNeeded && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_42%,rgba(251,146,60,0.05))]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-orange-50/65 to-transparent" />
        </>
      )}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Heart className={`w-5 h-5 ${color} ${isRescueNeeded ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-semibold tracking-wide text-slate-200/90">
              Plan Health
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">{score}%</span>
            <span className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${statusBadgeClass}`}>
              {status}
            </span>
          </div>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-14 h-14 transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="22"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-300/70"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={138}
              strokeDashoffset={138 - (138 * score) / 100}
              className={`${color} transition-all duration-700 ease-out`}
              fill="transparent"
              strokeLinecap="round"
            />
          </svg>
          <Icon className={`absolute w-5 h-5 ${color}`} />
        </div>
      </div>

      {/* Rescue Alert Warning Banner */}
      {isRescueNeeded && (
        <div className="relative z-10 mt-5 flex flex-col items-start justify-between gap-4 border-t border-white/15 pt-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 animate-bounce" />
            <span>Your plan is slipping. Rebalance work now.</span>
          </div>
          {showButton && onRescueClick && (
            <ElectricButton
              variant="rescueCompact"
              size="md"
              icon={Zap}
              onClick={onRescueClick}
              className="h-11 min-w-[160px] rounded-xl px-5 whitespace-nowrap shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35"
            >
              Rescue Now
            </ElectricButton>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanHealth;
