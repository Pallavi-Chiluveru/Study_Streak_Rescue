const { focusMilliseconds } = require('../services/focusTimeService');
const { getEffectiveEstimatedMinutes, updateUserPace } = require('../services/adaptiveEstimationService');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const User = require('../models/User');
const { getStartOfDay, getEndOfDay, isBeforeToday } = require('../utils/dateUtils');
const { calculatePlanHealth } = require('../services/healthService');
const { evaluateGamification } = require('../services/gamificationService');
const { createNotification } = require('../services/notificationService');
const { dateKey } = require('../services/notificationEvaluationService');

// @desc    Get tasks scheduled for today across all plans
// @route   GET /api/tasks/today
// @access  Private
const getTodayTasks = async (req, res, next) => {
  try {
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());

    // Auto mark overdue pending tasks before today as missed
    const overdueTasks = await Task.find({
      userId: req.user._id,
      status: 'pending',
      scheduledDate: { $lt: todayStart }
    });

    for (const ot of overdueTasks) {
      ot.status = 'missed';
      await ot.save();
    }

    const todayTasks = await Task.find({
      userId: req.user._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd }
    }).populate('planId', 'title category healthScore').sort({ priority: -1 });

    const totalRemainingMinutes = todayTasks
      .filter(t => t.status !== 'completed')
      .reduce((sum, t) => sum + (getEffectiveEstimatedMinutes(t)), 0);

    res.json({
      tasks: todayTasks,
      totalCount: todayTasks.length,
      completedCount: todayTasks.filter(t => t.status === 'completed').length,
      remainingMinutes: totalRemainingMinutes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks for specific plan
// @route   GET /api/plans/:planId/tasks
// @access  Private
const getPlanTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({
      userId: req.user._id,
      planId: req.params.planId
    }).sort({ scheduledDate: 1 });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// @desc    Start focus on a task
// @route   PATCH /api/tasks/:id/start
// @access  Private
const startTask = async (req, res, next) => {
  try {
    let task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status === 'missed' || isBeforeToday(task.scheduledDate)) {
      if (task.status === 'pending') {
        task.status = 'missed';
        await task.save();
      }
      return res.status(409).json({
        success: false,
        message: 'Reschedule this task before starting a focus session.'
      });
    }

    if (task.status === 'completed') {
      return res.status(409).json({ message: 'Task is already completed', task });
    }

    task = await Task.findOneAndUpdate({ _id: task._id, userId: req.user._id, status: { $ne: 'completed' }, focusRunningSince: null },
      { $set: { status: 'active', startedAt: task.startedAt || new Date(), focusRunningSince: new Date(), focusHeartbeatAt: new Date(), focusRecorded: true } },
      { returnDocument: 'after' }) || await Task.findById(task._id);

    res.json(task);
  } catch (error) {
    next(error);
  }
};

const startTaskEarly = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id, status: { $in: ['pending', 'rescheduled'] } });
    if (!task) return res.status(404).json({ message: 'Task is not available to start early.' });
    const learnerToday = dateKey(new Date(), req.user.timezone || 'UTC');
    task.scheduledDate = new Date(learnerToday + 'T12:00:00Z');
    task.status = 'active';
    task.startedAt = task.startedAt || new Date();
    task.focusRunningSince = new Date();
    task.focusHeartbeatAt = new Date();
    task.focusRecorded = true;
    await task.save();
    res.json(task);
  } catch (error) { next(error); }
};
// Pause also checkpoints the timer when closing; repeat calls do not add time.
const pauseTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status === 'completed') return res.status(409).json({ message: 'Task is already completed' });
    if (!task.focusRunningSince) return res.json(task);
    const updated = await Task.findOneAndUpdate({ _id: task._id, userId: req.user._id, status: { $ne: 'completed' }, updatedAt: task.updatedAt },
      { $set: { focusAccumulatedMs: focusMilliseconds(task), focusRunningSince: null } }, { returnDocument: 'after' });
    if (!updated) return res.status(409).json({ message: 'Timer changed. Refresh and try again.' });
    res.json(updated);
  } catch (error) { next(error); }
};

const heartbeatTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status === 'completed' || !task.focusRunningSince) return res.status(409).json({ message: 'Focus session is not running.' });
    const now = new Date();
    const updated = await Task.findOneAndUpdate({ _id: task._id, userId: req.user._id, updatedAt: task.updatedAt, status: { $ne: 'completed' }, focusRunningSince: task.focusRunningSince },
      { $set: { focusAccumulatedMs: focusMilliseconds(task, now.getTime()), focusRunningSince: now, focusHeartbeatAt: now } }, { returnDocument: 'after' });
    if (!updated) return res.status(409).json({ message: 'Timer changed. Please retry.' });
    res.json(updated);
  } catch (error) { next(error); }
};

// @desc    Complete a task & reward XP (+50 XP)
// @route   PATCH /api/tasks/:id/complete
// @access  Private
const completeTask = async (req, res, next) => {
  try {
    const fromFocus = req.body?.focusSession === true;
    let task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status === 'completed') {
      return res.status(409).json({ message: 'Task is already completed', task });
    }

    if (task.status === 'missed' || isBeforeToday(task.scheduledDate)) {
      if (task.status === 'pending') {
        task.status = 'missed';
        await task.save();
      }
      return res.status(409).json({
        success: false,
        message: 'Missed tasks must be rescheduled before they can be completed.'
      });
    }

    if (fromFocus && !task.focusRecorded) return res.status(409).json({ message: 'Start a focus session first.' });
    const now = new Date();
    const accumulated = task.focusRecorded ? focusMilliseconds(task, now.getTime()) : 0;
    // Ignore client-supplied durations. Only recorded active server intervals count.
    task = await Task.findOneAndUpdate({ _id: task._id, userId: req.user._id, status: { $ne: 'completed' }, updatedAt: task.updatedAt },
      { $set: { status: 'completed', completedAt: now, focusRunningSince: null,
        focusAccumulatedMs: accumulated, actualFocusMinutes: Math.round(accumulated / 600) / 100 } },
      { returnDocument: 'after' });
    if (!task) return res.status(409).json({ message: 'Task changed. Refresh and try again.' });

    // Reward +50 XP to user and update total focus time
    const user = await User.findById(req.user._id);
    const xpGained = 50;
    user.xp = (user.xp || 0) + xpGained;
    user.totalFocusMinutes = (user.totalFocusMinutes || 0) + (task.actualFocusMinutes || 0);

    // Update streak: if user completed a task today and hasn't logged active today, increase streak
    const today = getStartOfDay(new Date());
    const lastActive = user.lastActiveDate ? getStartOfDay(user.lastActiveDate) : null;

    if (!lastActive) {
      user.streak = 1;
    } else {
      const diffTime = today.getTime() - lastActive.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        user.streak += 1;
      } else if (diffDays > 1) {
        user.streak = 1;
      }
    }
    user.lastActiveDate = new Date();
    await user.save();

    const learningPace = await updateUserPace(req.user._id, task);

    // Update plan health
    const plan = await Plan.findById(task.planId);
    if (plan) {
      const planTasks = await Task.find({ planId: plan._id });
      if (planTasks.every((planTask) => planTask.status === 'completed')) {
        plan.status = 'completed';
      }
      const { healthScore } = calculatePlanHealth(plan, planTasks);
      plan.healthScore = healthScore;
      plan.healthHistory.push({ score: healthScore });
      await plan.save();
    }

    const gamification = await evaluateGamification(req.user._id);

    try {
      const notificationDate = dateKey(new Date(), user.timezone || 'UTC');
      await createNotification({
        user, eventType: 'STREAK_UPDATED', severity: 'low',
        dedupeKey: 'STREAK_UPDATED:' + user._id + ':' + notificationDate + ':' + user.streak,
        title: user.streak + '-day streak', message: 'Keep the momentum going.',
        actionLabel: 'View Dashboard', actionUrl: '/dashboard'
      });
      for (const achievement of gamification.newlyUnlocked || []) await createNotification({
        user, eventType: 'ACHIEVEMENT_UNLOCKED', severity: 'low',
        dedupeKey: 'ACHIEVEMENT_UNLOCKED:' + user._id + ':' + achievement.id,
        title: 'Achievement unlocked: ' + achievement.title, message: '+' + achievement.rewardXP + ' XP',
        actionLabel: 'View Achievements', actionUrl: '/achievements'
      });
      if (plan && await Task.countDocuments({ planId: plan._id, status: { $ne: 'completed' } }) === 0) await createNotification({
        user, eventType: 'DAILY_PLAN_COMPLETED', severity: 'low', dedupeKey: 'PLAN_COMPLETED:' + plan._id,
        title: plan.title + ' is complete', message: 'You completed every task in this plan.',
        actionLabel: 'View Plan', actionUrl: '/plans/' + plan._id, relatedPlanId: plan._id
      });
    } catch {
      console.error('Completion notification creation failed.');
    }
    res.json({
      message: 'Task completed! ⚡',
      task,
      learningPace,
      userStreak: user.streak,
      userXp: gamification.xp,
      userTotalFocusMinutes: user.totalFocusMinutes,
      gamification,
      xpGained: xpGained + gamification.rewardXP
    });
  } catch (error) {
    next(error);
  }
};

// @desc    DEMO CONTROL: Simulate Missed Yesterday Tasks
// @route   POST /api/tasks/simulate-missed
// @access  Private
const simulateMissedTasks = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const filter = { userId: req.user._id, status: { $ne: 'completed' } };
    if (planId) filter.planId = planId;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = getStartOfDay(yesterday);

    // Grab 3 pending tasks and move them to yesterday & status = missed
    const tasksToMiss = await Task.find(filter).limit(3);
    for (const t of tasksToMiss) {
      t.scheduledDate = yesterdayStart;
      t.status = 'missed';
      await t.save();
    }

    // Update plan health to reflect missed state
    if (planId) {
      const plan = await Plan.findById(planId);
      if (plan) {
        const freshTasks = await Task.find({ planId });
        const { healthScore } = calculatePlanHealth(plan, freshTasks);
        plan.healthScore = healthScore;
        plan.status = 'at_risk';
        await plan.save();
      }
    }

    res.json({
      message: `Simulated ${tasksToMiss.length} missed tasks for testing. Plan health updated!`,
      missedCount: tasksToMiss.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startTaskEarly,
  getTodayTasks,
  getPlanTasks,
  startTask,
  pauseTask,
  heartbeatTask,
  completeTask,
  simulateMissedTasks
};
