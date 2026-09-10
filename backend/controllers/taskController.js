const Task = require('../models/Task');
const Plan = require('../models/Plan');
const User = require('../models/User');
const { getStartOfDay, getEndOfDay } = require('../utils/dateUtils');
const { calculatePlanHealth } = require('../services/healthService');

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
      .reduce((sum, t) => sum + (t.estimatedMinutes || 45), 0);

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
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = 'active';
    task.startedAt = new Date();
    await task.save();

    res.json(task);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete a task & reward XP (+50 XP)
// @route   PATCH /api/tasks/:id/complete
// @access  Private
const completeTask = async (req, res, next) => {
  try {
    const { actualFocusMinutes } = req.body;
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status === 'completed') {
      return res.status(409).json({ message: 'Task is already completed', task });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    if (actualFocusMinutes) {
      task.actualFocusMinutes = parseInt(actualFocusMinutes);
    }
    await task.save();

    // Reward +50 XP to user and update total focus time
    const user = await User.findById(req.user._id);
    const xpGained = 50;
    user.xp = (user.xp || 0) + xpGained;
    user.totalFocusMinutes = (user.totalFocusMinutes || 0) + (task.actualFocusMinutes || task.estimatedMinutes || 45);

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

    // Update plan health
    const plan = await Plan.findById(task.planId);
    if (plan) {
      const planTasks = await Task.find({ planId: plan._id });
      const { healthScore } = calculatePlanHealth(plan, planTasks);
      plan.healthScore = healthScore;
      await plan.save();
    }

    res.json({
      message: 'Task completed! ⚡',
      task,
      xpGained,
      userStreak: user.streak,
      userXp: user.xp,
      userTotalFocusMinutes: user.totalFocusMinutes
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
  getTodayTasks,
  getPlanTasks,
  startTask,
  completeTask,
  simulateMissedTasks
};
