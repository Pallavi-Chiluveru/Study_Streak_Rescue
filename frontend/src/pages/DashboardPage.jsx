import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Zap, Heart, Clock, Plus, CheckCircle2, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/authContext.js';
import { useToast } from '../context/ToastContext';
import ElectricCard from '../components/ui/ElectricCard';
import ElectricButton from '../components/ui/ElectricButton';
import PlanHealth from '../components/ui/PlanHealth';
import TaskCard from '../components/tasks/TaskCard';
import FocusTimer from '../components/tasks/FocusTimer';
import RescueModal from '../components/rescue/RescueModal';
import QuickAdaptModal from '../components/tasks/QuickAdaptModal';
import EmptyState from '../components/ui/EmptyState';
import { formatDuration, pluralize } from '../utils/duration';

const showDemoControls = import.meta.env.VITE_DEMO_MODE === 'true';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, updateUserStats } = useAuth();
  const { addToast } = useToast();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoalPrompt, setShowGoalPrompt] = useState(false);

  // Focus Timer modal state
  const [timerTask, setTimerTask] = useState(null);

  // Rescue Modal state
  const [rescuePlan, setRescuePlan] = useState(null);
  const [rescueTasks, setRescueTasks] = useState([]);

  // Quick Adapt Modal state
  const [adaptPlanId, setAdaptPlanId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const res = await API.get('/dashboard');
      setDashboardData(res.data);
      if (res.data.user) {
        updateUserStats(res.data.user);
      }
    } catch (error) {
      console.error('Fetch Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    API.get('/goals/profile').then(r => setShowGoalPrompt((!r.data.goalOnboarding?.status || r.data.goalOnboarding.status === 'skipped') && !r.data.goalOnboarding?.dismissed)).catch(() => {});
  }, []);

  const handleTaskComplete = async (task, actualFocusMinutes) => {
    try {
      const res = await API.patch(`/tasks/${task._id}/complete`, { actualFocusMinutes });
      addToast('Task completed! +' + res.data.xpGained + ' XP', 'electric');
      if (res.data.gamification?.newlyUnlocked?.length) {
        res.data.gamification.newlyUnlocked.forEach((achievement) => addToast(achievement.title + ' unlocked! +' + achievement.rewardXP + ' XP', achievement.rewardXP >= 300 ? 'major' : 'success'));
      }
      if (res.data.gamification?.levelUp) addToast('Level up! Level ' + res.data.gamification.level.level + ': ' + res.data.gamification.level.name, 'major');
      fetchDashboardData();
    } catch (error) {
      console.error('Task complete error:', error);
      addToast(error.response?.data?.message || 'Failed to mark task complete', 'error');
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

  const handleOpenRescueModal = async (planId) => {
    try {
      const res = await API.get(`/plans/${planId}`);
      setRescuePlan(res.data.plan);
      setRescueTasks(res.data.tasks);
    } catch (error) {
      console.error('Fetch plan error for rescue:', error);
      addToast('Unable to open rescue modal', 'error');
    }
  };

  // DEMO MODE CONTROL: Miss yesterday's tasks for instant testing!
  const handleSimulateMissed = async () => {
    try {
      const res = await API.post('/tasks/simulate-missed', {
        planId: dashboardData?.activePlans?.[0]?._id
      });
      addToast('Demo mode: ' + res.data.message, 'warning');
      fetchDashboardData();
    } catch (error) {
      console.error('Demo simulation error:', error);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Zap className="w-10 h-10 text-orange-500 animate-lightning mx-auto mb-3" />
        <p className="font-mono text-xs">Loading energy metrics...</p>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const todayFocus = dashboardData?.todayFocus;
  const activePlans = dashboardData?.activePlans || [];

  return (
    <div className="space-y-8 pb-12">
      {showGoalPrompt && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-500/30 dark:bg-orange-500/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-lg font-bold">Organize All Your Goals</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Working toward several things at once? Build one realistic schedule.</p></div>
            <div className="flex gap-2"><ElectricButton size="sm" onClick={() => navigate('/onboarding/goals')}>Set Up My Goals</ElectricButton><ElectricButton size="sm" variant="secondary" onClick={async()=>{await API.patch('/goals/onboarding',{dismissed:true});setShowGoalPrompt(false);}}>Maybe Later</ElectricButton></div>
          </div>
        </div>
      )}
      {showDemoControls && (
        <div className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs dark:border-orange-500/20 dark:bg-orange-500/10">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Zap className="w-4 h-4 text-orange-500 animate-lightning" />
            <span className="font-mono">Demo mode: simulate a slipping schedule to test Rescue My Plan.</span>
          </div>
          <button
            onClick={handleSimulateMissed}
            className="rounded-lg border border-red-600 bg-red-500 px-3 py-1 font-semibold text-white transition-colors hover:bg-red-600 dark:border-red-500/50 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
          >
            Simulate Missed Tasks
          </button>
        </div>
      )}

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CURRENT STREAK CARD */}
        <ElectricCard className="relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-400">Current Streak</span>
            <Flame className={`w-5 h-5 ${stats?.streakDays > 3 ? 'text-orange-400 fill-orange-400 animate-bounce' : 'text-orange-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats?.streakDays || 0}</span>
            <span className="text-sm font-semibold text-orange-500">{(stats?.streakDays || 0) === 1 ? 'day' : 'days'}</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
            {(stats?.streakDays || 0) === 0 ? 'Complete a task today to start your streak.' : stats.streakDays === 1 ? "You're on your way. Keep it going today." : 'Keep the momentum going.'}
          </p>
        </ElectricCard>

        {/* XP CARD */}
        <ElectricCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-400">Total XP</span>
            <Zap className="w-5 h-5 text-orange-500 animate-lightning" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-500">{stats?.xp || 0}</span>
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-300">XP</span>
          </div>
          {stats?.level && <p className="mt-2 text-sm font-semibold text-orange-600 dark:text-orange-300">Level {stats.level.level}<span className="mx-1" aria-hidden="true">·</span>{stats.level.name}</p>}
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">Earn +50 XP for each completed task.</p>
        </ElectricCard>

        {/* PLAN HEALTH CARD */}
        <ElectricCard rescueAlert={(stats?.avgHealthScore ?? 100) < 60}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-400">Avg Plan Health</span>
            <Heart className={`w-5 h-5 ${(stats?.avgHealthScore ?? 100) < 60 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${(stats?.avgHealthScore ?? 100) < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
              {stats?.avgHealthScore ?? 100}%
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {(stats?.avgHealthScore ?? 100) >= 80 ? 'On Track' : (stats?.avgHealthScore ?? 100) >= 60 ? 'Needs Attention' : (stats?.avgHealthScore ?? 100) >= 40 ? 'At Risk' : 'Slipping'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
            {(stats?.avgHealthScore ?? 100) < 60 ? <><AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden="true" />Your plan needs a rescue.</> : 'Pace is healthy.'}
          </p>
        </ElectricCard>

        {/* FOCUS TIME CARD */}
        <ElectricCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-400">Focus Time</span>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatDuration(stats?.totalFocusMinutes || 0)}</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">Time spent in focused study mode.</p>
        </ElectricCard>
      </div>

      {/* TODAY'S FOCUS SECTION */}
      <ElectricCard glowing className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-300 text-xs font-semibold mb-1">
              <Zap className="w-3.5 h-3.5 text-orange-500 animate-lightning" />
              TODAY'S FOCUS
            </div>
            <h3 className="text-xl font-bold text-white">
              {(todayFocus?.totalCount || 0) === 0 ? 'No tasks remaining' : <>{pluralize(Math.max(0, (todayFocus?.totalCount || 0) - (todayFocus?.completedCount || 0)), 'task')}<span className="mx-1" aria-hidden="true">·</span>{formatDuration(todayFocus?.remainingMinutes || 0)} remaining</>}
            </h3>
          </div>

          {activePlans.length > 0 && (
            <ElectricButton
              variant="secondary"
              size="sm"
              icon={Clock}
              onClick={() => setAdaptPlanId(activePlans[0]._id)}
            >
              I Have Less Time Today
            </ElectricButton>
          )}
        </div>

        {/* Tasks List */}
        {todayFocus?.tasks?.length === 0 ? (
          <EmptyState
            title="You're clear for today!"
            description="No scheduled tasks remaining for today. Great job keeping your momentum!"
            actionLabel="Create A New Plan"
            onAction={() => navigate('/plans/new')}
          />
        ) : (
          <div className="space-y-3">
            {todayFocus?.tasks?.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onComplete={(t) => handleTaskComplete(t)}
                onOpenTimer={handleOpenTimer}
              />
            ))}
          </div>
        )}
      </ElectricCard>

      {/* ACTIVE PLANS OVERVIEW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Active Study Plans
          </h3>
          <ElectricButton variant="primary" size="sm" icon={ArrowRight} onClick={() => navigate('/plans')}>
            View All Plans
          </ElectricButton>
        </div>

        {activePlans.length === 0 ? (
          <EmptyState
            title="No Active Plans"
            description="Create your self-healing study plan now."
            actionLabel="Create Plan"
            onAction={() => navigate('/plans/new')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePlans.map((plan) => (
              <ElectricCard
                key={plan._id}
                rescueAlert={plan.healthScore < 50}
                onClick={() => navigate(`/plans/${plan._id}`)}
                className="space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-orange-500 uppercase tracking-wider">
                      {plan.category}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">{plan.title}</h4>
                  </div>
                  <PlanHealth score={plan.healthScore} compact />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-400 font-medium">
                    <span>Completion</span>
                    <span className="text-slate-900 dark:text-white font-bold">{plan.progressPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${plan.progressPct}%` }}
                    />
                  </div>
                </div>

                {plan.healthScore < 50 && (
                  <ElectricButton
                    variant="rescue"
                    size="sm"
                    icon={Zap}
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRescueModal(plan._id);
                    }}
                  >
                    Rescue My Plan
                  </ElectricButton>
                )}
              </ElectricCard>
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

      {/* RESCUE MY PLAN MODAL */}
      <RescueModal
        plan={rescuePlan}
        tasks={rescueTasks}
        isOpen={!!rescuePlan}
        onClose={() => setRescuePlan(null)}
        onRescueComplete={() => fetchDashboardData()}
      />

      {/* QUICK ADAPT MODAL */}
      <QuickAdaptModal
        planId={adaptPlanId}
        isOpen={!!adaptPlanId}
        onClose={() => setAdaptPlanId(null)}
        onAdaptComplete={() => fetchDashboardData()}
      />
    </div>
  );
};

export default DashboardPage;


