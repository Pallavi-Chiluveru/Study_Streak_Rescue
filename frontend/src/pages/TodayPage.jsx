import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import FocusTimer from '../components/tasks/FocusTimer';
import EmptyState from '../components/ui/EmptyState';
import ScheduleDateGroup from '../components/schedule/ScheduleDateGroup';
import { groupTasksByScheduledDate } from '../utils/dateUtils';
import { formatDuration, pluralize } from '../utils/duration';

const TodayPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoStartedTask = useRef(null);
  const { addToast } = useToast();

  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerTask, setTimerTask] = useState(null);

  const fetchTodayData = async () => {
    try {
      const res = await API.get('/tasks/today');
      setTodayData(res.data);
    } catch (error) {
      console.error('Fetch today tasks error:', error);
      addToast('Failed to load today focus items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const handleTaskComplete = async (task, focusSession = false) => {
    try {
      const res = await API.patch(`/tasks/${task._id}/complete`, { focusSession });
      addToast('Task completed! +' + res.data.xpGained + ' XP', 'electric');
      res.data.gamification?.newlyUnlocked?.forEach((achievement) => addToast(achievement.title + ' unlocked! +' + achievement.rewardXP + ' XP', achievement.rewardXP >= 300 ? 'major' : 'success'));
      if (res.data.gamification?.levelUp) addToast('Level up! Level ' + res.data.gamification.level.level + ': ' + res.data.gamification.level.name, 'major');
      fetchTodayData();
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

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId || !todayData?.tasks || autoStartedTask.current === taskId) return;
    const task = todayData.tasks.find(item => item._id === taskId);
    if (!task) return;
    autoStartedTask.current = taskId;
    handleOpenTimer(task);
  }, [todayData, searchParams]);
  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Zap className="w-10 h-10 text-orange-400 animate-lightning mx-auto mb-3" />
        <p className="font-mono text-xs">Loading today focus tasks...</p>
      </div>
    );
  }

  const tasks = todayData?.tasks || [];
  const scheduledGroups = groupTasksByScheduledDate(tasks);
  const completedCount = todayData?.completedCount || 0;
  const remainingMinutes = todayData?.remainingMinutes || 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-semibold mb-1">
            <Zap className="w-3.5 h-3.5 text-orange-400 animate-lightning" />
            TODAY FOCUS MODE
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Study Timeline ({pluralize(tasks.length, 'item')})
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {pluralize(completedCount, 'task')} completed<span className="mx-1" aria-hidden="true">·</span>{formatDuration(remainingMinutes)} remaining
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="You're clear for today!"
          description="You have finished all tasks scheduled for today or don't have any active plans yet."
          actionLabel="Create A Plan"
          onAction={() => navigate('/plans/new')}
        />
      ) : (
        <div>
          {scheduledGroups.map((group) => (
            <ScheduleDateGroup
              key={group.key}
              date={group.date}
              tasks={group.tasks}
              onComplete={(task) => handleTaskComplete(task)}
              onOpenTimer={handleOpenTimer}
            />
          ))}
        </div>
      )}

      <FocusTimer
        key={timerTask?._id || "closed"}
        task={timerTask}
        isOpen={!!timerTask}
        onClose={() => setTimerTask(null)}
        onCompleteTask={(t, elapsed) => handleTaskComplete(t, elapsed)}
      />
    </div>
  );
};

export default TodayPage;


