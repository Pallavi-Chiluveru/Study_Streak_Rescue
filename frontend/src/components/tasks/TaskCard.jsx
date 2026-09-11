import React, { useState } from 'react';
import { Play, CheckCircle2, Clock, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';

const TaskCard = ({ task, onStart, onComplete, onOpenTimer }) => {
  const [justCompleted, setJustCompleted] = useState(false);

  const handleComplete = () => {
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

  const currentStatus = statusConfig[task.status] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  const priorityColor = {
    high: 'text-red-400 border-red-500/30 bg-red-500/10',
    medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    low: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
  };

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all duration-300 backdrop-blur-sm ${currentStatus.border} ${currentStatus.bg}`}
    >
      {/* Floating XP Gain Burst animation when task completed */}
      {justCompleted && (
        <div className="absolute -top-3 right-6 z-20 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs shadow-xl animate-bounce">
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>+50 XP</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Status Checkbox / Action Trigger */}
          <button
            onClick={task.status !== 'completed' ? handleComplete : undefined}
            disabled={task.status === 'completed'}
            className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${task.status === 'completed'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                : 'border-slate-700 hover:border-orange-400 bg-slate-800/80 text-transparent hover:text-orange-500'
              }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className={`text-sm font-bold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
                {task.title}
              </h4>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${currentStatus.text} border-current opacity-90`}>
                {currentStatus.badge}
              </span>
            </div>

            {task.description && (
              <p className="text-xs text-slate-400 line-clamp-1 mb-2">{task.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {task.estimatedMinutes} mins
              </span>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.2 rounded border ${priorityColor[task.priority] || priorityColor.medium}`}>
                {task.priority || 'medium'} priority
              </span>
              {task.scheduledDate && (
                <span className="text-[11px] text-slate-500 font-mono">
                  📅 {new Date(task.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {task.status !== 'completed' && (
            <>
              {onOpenTimer && (
                <ElectricButton
                  variant="secondary"
                  size="sm"
                  icon={Play}
                  onClick={() => onOpenTimer(task)}
                >
                  Start Focus
                </ElectricButton>
              )}

              <ElectricButton
                variant="success"
                size="sm"
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
