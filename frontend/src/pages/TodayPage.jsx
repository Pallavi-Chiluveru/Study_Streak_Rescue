import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import FocusTimer from '../components/tasks/FocusTimer';
import EmptyState from '../components/ui/EmptyState';
import ScheduleDateGroup from '../components/schedule/ScheduleDateGroup';
import { groupTasksByScheduledDate } from '../utils/dateUtils';

const TodayPage = () => {
  const navigate = useNavigate();
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

  const handleTaskComplete = async (task, actualFocusMinutes) => {
    try {
      const res = await API.patch(`/tasks/${task._id}/complete`, { actualFocusMinutes });
      addToast(`⚡ Task completed! +${res.data.xpGained} XP`, 'electric');
      fetchTodayData();
    } catch (error) {
      console.error('Task complete error:', error);
      addToast('Failed to mark task complete', 'error');
    }
  };

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
            Study Timeline ({tasks.length} Items)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {completedCount} Completed • {Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m Remaining
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="🎉 You're Clear For Today!"
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
              onOpenTimer={(task) => setTimerTask(task)}
            />
          ))}
        </div>
      )}

      <FocusTimer
        task={timerTask}
        isOpen={!!timerTask}
        onClose={() => setTimerTask(null)}
        onCompleteTask={(t, elapsed) => handleTaskComplete(t, elapsed)}
      />
    </div>
  );
};

export default TodayPage;
