import React from 'react';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import TaskCard from '../tasks/TaskCard';
import { formatScheduleDate, getRelativeDateLabel, normalizeDate } from '../../utils/dateUtils';

const ScheduleDateGroup = ({ date, tasks, onComplete, onOpenTimer }) => {
  const relativeLabel = getRelativeDateLabel(date);
  const normalizedDate = normalizeDate(date);
  const isPast = normalizedDate && normalizedDate < normalizeDate(new Date());
  const allCompleted = tasks.length > 0 && tasks.every((task) => task.status === 'completed');
  const statusLabel = isPast && allCompleted ? 'COMPLETED' : relativeLabel;
  const statusClass = statusLabel === 'MISSED'
    ? 'text-red-600 dark:text-red-400'
    : statusLabel === 'COMPLETED'
      ? 'text-emerald-600 dark:text-emerald-400'
      : statusLabel === 'TODAY' || statusLabel === 'TOMORROW'
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-slate-500 dark:text-slate-400';

  return (
    <section className="mb-8 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {statusLabel === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CalendarDays className="h-4 w-4 text-orange-500" />}
        <span className="font-bold text-slate-900 dark:text-slate-100">{formatScheduleDate(date)}</span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span className={`text-sm font-semibold ${statusClass}`}>{statusLabel}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">({tasks.length})</span>
      </div>
      <div className="space-y-2.5">
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} onComplete={onComplete ? (currentTask) => onComplete(currentTask) : undefined} onOpenTimer={onOpenTimer ? (currentTask) => onOpenTimer(currentTask) : undefined} />
        ))}
      </div>
    </section>
  );
};

export default ScheduleDateGroup;