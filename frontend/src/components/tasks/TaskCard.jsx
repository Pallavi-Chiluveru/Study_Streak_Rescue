import { getEffectiveEstimatedMinutes } from '../../utils/taskEstimates';
import React, { useState } from 'react';
import { Play, CheckCircle2, Clock, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';
import { isTaskMissed } from '../../utils/dateUtils';

const TaskCard = ({ task, onComplete, onOpenTimer, onRescue }) => {
  const [justCompleted, setJustCompleted] = useState(false);
  const effectiveStatus = isTaskMissed(task) ? 'missed' : task.status;

  const handleComplete = () => {
    if (effectiveStatus === 'missed' || effectiveStatus === 'completed') return;
    setJustCompleted(true);
    if (onComplete) onComplete(task);
    setTimeout(() => {
      setJustCompleted(false);
    }, 1200);
  };

  const statusConfig = {
    pending: {
      badge: 'Pending',
      border: 'border-slate-800',
      bg: 'bg-slate-900/60',
      text: 'text-slate-400',
      icon: Clock
    },
    active: {
      badge: 'In Progress ⚡',
      border: 'border-orange-500/60 shadow-lg shadow-orange-950/30 animate-border-flow',
      bg: 'bg-slate-900/90',
      text: 'text-orange-300',
      icon: Play
    },
    completed: {
      badge: 'Completed ✅',
      border: 'border-emerald-500/50 bg-emerald-950/20',
      bg: 'bg-slate-900/60',
      text: 'text-emerald-400',
      icon: CheckCircle2
    },
    missed: {
      badge: 'Overdue / Missed ⚠',
      border: 'border-red-500/60 bg-red-950/20 animate-rescue-pulse',
      bg: 'bg-slate-900/90',
      text: 'text-red-400',
      icon: AlertCircle
    },
    rescheduled: {
      badge: 'Rescheduled ⚡',
      border: 'border-amber-500/50 bg-amber-950/20',
      bg: 'bg-slate-900/80',
      text: 'text-amber-400',
      icon: RefreshCw
    }
  };

  const currentStatus = statusConfig[effectiveStatus] || statusConfig.pending;

  const priorityColor = {
    high: 'text-red-400 border-red-500/30 bg-red-500/10',
    medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    low: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
  };

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all duration-300 backdrop-blur-sm md:p-5 ${currentStatus.border} ${currentStatus.bg}`}
    >
      {/* Floating XP Gain Burst animation when task completed */}
      {justCompleted && (
        <div className="absolute -top-3 right-6 z-20 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs shadow-xl animate-bounce">
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>+50 XP</span>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          {/* Status Checkbox / Action Trigger */}
          <button
            onClick={effectiveStatus !== 'completed' && effectiveStatus !== 'missed' ? handleComplete : undefined}
            disabled={effectiveStatus === 'completed' || effectiveStatus === 'missed'}
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 ${task.status === 'completed'
              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
              : effectiveStatus === 'missed'
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-slate-700 hover:border-orange-400 bg-slate-800/80 text-transparent hover:text-orange-500'
              }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className={`text-base font-semibold md:text-lg ${effectiveStatus === 'completed' ? 'line-through text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {task.title}
              </h4>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold md:text-sm ${currentStatus.text} border-current opacity-90`}>
                {currentStatus.badge}
              </span>
            </div>

            {task.description && (
              <p className="mb-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300 md:text-base">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-slate-500" />
                {effectiveStatus === 'completed' ? 'Planned ' : 'Estimated '}{getEffectiveEstimatedMinutes(task)} min
              </span>
              {effectiveStatus === 'completed' && task.actualFocusMinutes > 0 && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Actual {Math.round(task.actualFocusMinutes * 10) / 10} min</span>}
              {effectiveStatus !== 'completed' && task.estimationSource === 'adaptive' && <span title="Based on your completed focus sessions" className="rounded-full bg-orange-50 px-2 py-1 text-sm text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">Personalized</span>}
              <span className={`rounded border px-2.5 py-1 text-xs font-semibold uppercase md:text-sm ${priorityColor[task.priority] || priorityColor.medium}`}>
                {task.priority || 'medium'} priority
              </span>
            </div>
            {effectiveStatus === 'missed' && (
              <p className="mt-2 text-sm font-medium text-red-500 dark:text-red-400">This task's scheduled date has passed. Reschedule it before continuing.</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          {effectiveStatus === 'missed' ? (
            onRescue && (
              <ElectricButton variant="rescueCompact" size="sm" icon={Zap} onClick={() => onRescue(task)}>
                Rescue to Reschedule
              </ElectricButton>
            )
          ) : effectiveStatus === 'completed' ? (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Completed</span>
          ) : (
            <>
              {onOpenTimer && (
                <ElectricButton
                  variant="secondary"
                  size="md"
                  icon={Play}
                  onClick={() => onOpenTimer(task)}
                >
                  Start Focus
                </ElectricButton>
              )}

              <ElectricButton
                variant="success"
                size="md"
                icon={CheckCircle2}
                onClick={handleComplete}
              >
                Complete
              </ElectricButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
