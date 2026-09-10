import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, AlertTriangle, Zap, ArrowLeft, Play } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import ElectricCard from '../components/ui/ElectricCard';
import ElectricButton from '../components/ui/ElectricButton';
import PlanHealth from '../components/ui/PlanHealth';
import TaskCard from '../components/tasks/TaskCard';
import FocusTimer from '../components/tasks/FocusTimer';
import RescueModal from '../components/rescue/RescueModal';
import QuickAdaptModal from '../components/tasks/QuickAdaptModal';
import EmptyState from '../components/ui/EmptyState';

const PlanDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [timerTask, setTimerTask] = useState(null);
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [showAdaptModal, setShowAdaptModal] = useState(false);

  const fetchPlanDetails = async () => {
    try {
      const res = await API.get(`/plans/${id}`);
      setPlanData(res.data);
    } catch (error) {
      console.error('Fetch plan details error:', error);
      addToast('Failed to load plan details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanDetails();
  }, [id]);

  const handleTaskComplete = async (task, actualFocusMinutes) => {
    try {
      const res = await API.patch(`/tasks/${task._id}/complete`, { actualFocusMinutes });
      addToast(`⚡ Task completed! +${res.data.xpGained} XP`, 'electric');
      fetchPlanDetails();
    } catch (error) {
      console.error('Task complete error:', error);
      addToast('Failed to mark task complete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Zap className="w-10 h-10 text-orange-400 animate-lightning mx-auto mb-3" />
        <p className="font-mono text-xs">Loading plan schedule...</p>
      </div>
    );
  }

  if (!planData || !planData.plan) {
    return (
      <EmptyState
        title="Plan Not Found"
        description="The plan you are looking for does not exist."
        actionLabel="Back to Plans"
        onAction={() => navigate('/plans')}
      />
    );
  }

  const { plan, tasks } = planData;

  // Calculate days remaining
  const now = new Date();
  const deadline = new Date(plan.deadline);
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate remaining workload hours
  const remainingMinutes = tasks
    .filter(t => t.status !== 'completed')
    .reduce((sum, t) => sum + (t.estimatedMinutes || 45), 0);
  const remainingHoursFormatted = `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`;

  // Group tasks into categories: TODAY, TOMORROW, UPCOMING, COMPLETED, MISSED
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);

  const groupedTasks = {
    today: [],
    tomorrow: [],
    upcoming: [],
    completed: [],
    missed: []
  };

  tasks.forEach(t => {
    if (t.status === 'completed') {
      groupedTasks.completed.push(t);
    } else if (t.status === 'missed') {
      groupedTasks.missed.push(t);
    } else {
      const scheduled = new Date(t.scheduledDate);
      scheduled.setHours(0, 0, 0, 0);

      if (scheduled.getTime() === today.getTime()) {
        groupedTasks.today.push(t);
      } else if (scheduled.getTime() === tomorrow.getTime()) {
        groupedTasks.tomorrow.push(t);
      } else {
        groupedTasks.upcoming.push(t);
      }
    }
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/plans')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </button>

        <div className="flex items-center gap-3">
          <ElectricButton variant="secondary" size="sm" onClick={() => setShowAdaptModal(true)}>
            ⚡ I Have Less Time Today
          </ElectricButton>

          <ElectricButton variant="rescue" size="md" onClick={() => setShowRescueModal(true)}>
            ⚡ RESCUE MY PLAN
          </ElectricButton>
        </div>
      </div>

      {/* PLAN SUMMARY HEADER CARD */}
      <ElectricCard rescueAlert={plan.healthScore < 50} className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-orange-400">
              {plan.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 mb-2">
              {plan.title}
            </h1>
            {plan.description && (
              <p className="text-sm text-slate-300 max-w-xl">{plan.description}</p>
            )}
          </div>

          <PlanHealth
            score={plan.healthScore}
            onRescueClick={() => setShowRescueModal(true)}
          />
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Target Deadline</span>
            <span className="text-sm font-bold text-white">
              {new Date(plan.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Progress</span>
            <span className="text-sm font-bold text-emerald-400">{plan.progressPct}% Complete</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Workload Remaining</span>
            <span className="text-sm font-bold text-orange-300">{remainingHoursFormatted}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Days Remaining</span>
            <span className="text-sm font-bold text-orange-400">{daysRemaining} Days</span>
          </div>
        </div>
      </ElectricCard>

      {/* TASK GROUPS */}
      <div className="space-y-6">
        {/* MISSED TASKS SECTION */}
        {groupedTasks.missed.length > 0 && (
          <div className="space-y-3 p-5 rounded-2xl border border-red-500/50 bg-red-950/20 backdrop-blur-md animate-rescue-pulse">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                MISSED / OVERDUE TASKS ({groupedTasks.missed.length})
              </h3>
              <ElectricButton variant="rescue" size="sm" onClick={() => setShowRescueModal(true)}>
                ⚡ Rescue My Plan Now
              </ElectricButton>
            </div>
            <div className="space-y-2.5">
              {groupedTasks.missed.map(t => (
                <TaskCard
                  key={t._id}
                  task={t}
                  onComplete={(task) => handleTaskComplete(task)}
                  onOpenTimer={(task) => setTimerTask(task)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TODAY TASKS */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-2 font-mono">
            <Zap className="w-4 h-4 text-orange-400 animate-lightning" />
            TODAY'S SCHEDULE ({groupedTasks.today.length})
          </h3>
          {groupedTasks.today.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 font-mono">
              No tasks scheduled for today.
            </div>
          ) : (
            groupedTasks.today.map(t => (
              <TaskCard
                key={t._id}
                task={t}
                onComplete={(task) => handleTaskComplete(task)}
                onOpenTimer={(task) => setTimerTask(task)}
              />
            ))
          )}
        </div>

        {/* TOMORROW TASKS */}
        {groupedTasks.tomorrow.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-orange-300 flex items-center gap-2 font-mono">
              <Calendar className="w-4 h-4 text-orange-400" />
              TOMORROW ({groupedTasks.tomorrow.length})
            </h3>
            {groupedTasks.tomorrow.map(t => (
              <TaskCard
                key={t._id}
                task={t}
                onComplete={(task) => handleTaskComplete(task)}
                onOpenTimer={(task) => setTimerTask(task)}
              />
            ))}
          </div>
        )}

        {/* UPCOMING TASKS */}
        {groupedTasks.upcoming.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2 font-mono">
              UPCOMING ({groupedTasks.upcoming.length})
            </h3>
            {groupedTasks.upcoming.map(t => (
              <TaskCard
                key={t._id}
                task={t}
                onComplete={(task) => handleTaskComplete(task)}
                onOpenTimer={(task) => setTimerTask(task)}
              />
            ))}
          </div>
        )}

        {/* COMPLETED TASKS */}
        {groupedTasks.completed.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              COMPLETED WORK ({groupedTasks.completed.length})
            </h3>
            {groupedTasks.completed.map(t => (
              <TaskCard
                key={t._id}
                task={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* FOCUS TIMER MODAL */}
      <FocusTimer
        task={timerTask}
        isOpen={!!timerTask}
        onClose={() => setTimerTask(null)}
        onCompleteTask={(t, elapsed) => handleTaskComplete(t, elapsed)}
      />

      {/* RESCUE MODAL */}
      <RescueModal
        plan={plan}
        tasks={tasks}
        isOpen={showRescueModal}
        onClose={() => setShowRescueModal(false)}
        onRescueComplete={() => fetchPlanDetails()}
      />

      {/* QUICK ADAPT MODAL */}
      <QuickAdaptModal
        planId={plan._id}
        isOpen={showAdaptModal}
        onClose={() => setShowAdaptModal(false)}
        onAdaptComplete={() => fetchPlanDetails()}
      />
    </div>
  );
};

export default PlanDetailsPage;
