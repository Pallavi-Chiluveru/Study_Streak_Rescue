import { getEffectiveEstimatedMinutes } from '../utils/taskEstimates';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Zap, ArrowLeft } from 'lucide-react';
import API from '../services/api';
import { formatDuration } from '../utils/duration';
import { useToast } from '../context/ToastContext';
import ElectricCard from '../components/ui/ElectricCard';
import ElectricButton from '../components/ui/ElectricButton';
import PlanHealth from '../components/ui/PlanHealth';
import FocusTimer from '../components/tasks/FocusTimer';
import RescueModal from '../components/rescue/RescueModal';
import QuickAdaptModal from '../components/tasks/QuickAdaptModal';
import EmptyState from '../components/ui/EmptyState';
import ScheduleDateGroup from '../components/schedule/ScheduleDateGroup';
import { groupTasksByScheduledDate } from '../utils/dateUtils';

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

  const handleTaskComplete = async (task, focusSession = false) => {
    try {
      const res = await API.patch(`/tasks/${task._id}/complete`, { focusSession });
      addToast('Task completed! +' + res.data.xpGained + ' XP', 'electric');
      res.data.gamification?.newlyUnlocked?.forEach((achievement) => addToast(achievement.title + ' unlocked! +' + achievement.rewardXP + ' XP', 'success'));
      if (res.data.gamification?.levelUp) addToast('Level up! Level ' + res.data.gamification.level.level + ': ' + res.data.gamification.level.name, 'rescue');
      fetchPlanDetails();
      return true;
    } catch (error) {
      console.error('Task complete error:', error);
      addToast(error.response?.data?.message || 'Failed to mark task complete', 'error');
      return false;
    }
  };

  const handleOpenTimer = async (task) => {
    try {
      const response = await API.patch(`/tasks/${task._id}/start`);
      setTimerTask(response.data);
    } catch (error) {
      addToast(error.response?.data?.message || 'Unable to start this focus session', 'error');
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
    .reduce((sum, t) => sum + (getEffectiveEstimatedMinutes(t)), 0);
  const remainingHoursFormatted = formatDuration(remainingMinutes);

  const scheduledGroups = groupTasksByScheduledDate(tasks);

  return (
    <div className="plan-details-page space-y-8 pb-12">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/plans')}
          className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </button>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <ElectricButton variant="secondary" size="md" icon={Clock} onClick={() => setShowAdaptModal(true)} className="h-11 text-sm md:text-base">
            I Have Less Time Today
          </ElectricButton>

          <ElectricButton variant="rescueCompact" size="md" icon={Zap} onClick={() => setShowRescueModal(true)} className="h-11 min-w-[190px] rounded-xl px-5 whitespace-nowrap">
            Rescue My Plan
          </ElectricButton>
        </div>
      </div>

      {/* PLAN SUMMARY HEADER CARD */}
      <ElectricCard rescueAlert={plan.healthScore < 50} className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
              {plan.category}
            </span>
            <h1 className="mt-1 mb-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-4xl">
              {plan.title}
            </h1>
            {plan.description && (
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">{plan.description}</p>
            )}
          </div>

          <PlanHealth
            score={plan.healthScore}
            onRescueClick={() => setShowRescueModal(true)}
          />
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Target Deadline</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 md:text-lg">
              {new Date(plan.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Progress</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 md:text-lg">{plan.progressPct}% Complete</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Workload Remaining</span>
            <span className="text-base font-bold text-orange-600 dark:text-orange-300 md:text-lg">{remainingHoursFormatted}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Days Remaining</span>
            <span className="text-base font-bold text-orange-600 dark:text-orange-400 md:text-lg">{daysRemaining} Days</span>
          </div>
        </div>
      </ElectricCard>

      {/* CHRONOLOGICAL DATE GROUPS */}
      <div>
        {scheduledGroups.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            No scheduled tasks yet.
          </div>
        ) : (
          scheduledGroups.map((group) => (
            <ScheduleDateGroup
              key={group.key}
              date={group.date}
              tasks={group.tasks}
              onComplete={(task) => handleTaskComplete(task)}
              onOpenTimer={handleOpenTimer}
              onRescue={() => setShowRescueModal(true)}
            />
          ))
        )}
      </div>

      {/* FOCUS TIMER MODAL */}
      <FocusTimer
        key={timerTask?._id || "closed"}
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

