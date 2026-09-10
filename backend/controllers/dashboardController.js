const User = require('../models/User');
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const { getStartOfDay, getEndOfDay } = require('../utils/dateUtils');
const { calculatePlanHealth } = require('../services/healthService');

// @desc    Get main dashboard metrics
// @route   GET /api/dashboard
// @access  Private
const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('-password');

    const plans = await Plan.find({ userId }).sort({ createdAt: -1 });
    const allTasks = await Task.find({ userId });

    // Keep dashboard health in sync with overdue work before returning metrics.
    const todayStart = getStartOfDay(new Date());
    const overdueTasks = allTasks.filter(
      task => task.status === 'pending' && getStartOfDay(task.scheduledDate) < todayStart
    );
    for (const task of overdueTasks) {
      task.status = 'missed';
      await task.save();
    }
    const refreshedTasks = overdueTasks.length > 0 ? await Task.find({ userId }) : allTasks;
    const tasksByPlan = new Map();
    for (const task of refreshedTasks) {
      const key = String(task.planId);
      if (!tasksByPlan.has(key)) tasksByPlan.set(key, []);
      tasksByPlan.get(key).push(task);
    }
    for (const plan of plans) {
      const { healthScore } = calculatePlanHealth(plan, tasksByPlan.get(String(plan._id)) || []);
      plan.healthScore = healthScore;
      plan.status = healthScore < 50 ? 'rescue_needed' : plan.status;
      await plan.save();
    }

    // Calculate overall plan health average
    let avgHealthScore = 100;
    if (plans.length > 0) {
      const totalHealth = plans.reduce((sum, p) => sum + (p.healthScore || 100), 0);
      avgHealthScore = Math.round(totalHealth / plans.length);
    }

    // Today focus tasks
    const todayEnd = getEndOfDay(new Date());

    const todayTasks = await Task.find({
      userId,
      scheduledDate: { $gte: todayStart, $lte: todayEnd }
    }).populate('planId', 'title category healthScore').sort({ priority: -1 });

    const todayRemainingMinutes = todayTasks
      .filter(t => t.status !== 'completed')
      .reduce((sum, t) => sum + (t.estimatedMinutes || 45), 0);

    const missedCountTotal = refreshedTasks.filter(t => t.status === 'missed').length;

    // Build notifications/alerts
    const notifications = [];
    if (missedCountTotal > 0) {
      notifications.push({
        id: 'rescue_needed',
        type: 'warning',
        title: 'Plan Slipping',
        message: `You have ${missedCountTotal} missed task(s). Rescue your plan to get back on track!`
      });
    }
    if (user.streak >= 3) {
      notifications.push({
        id: 'streak_milestone',
        type: 'success',
        title: 'Streak Active! 🔥',
        message: `${user.streak} Day Study Streak! Keep the momentum alive.`
      });
    }

    res.json({
      user: {
        name: user.name,
        email: user.email,
        streak: user.streak || 0,
        xp: user.xp || 0,
        totalFocusMinutes: user.totalFocusMinutes || 0,
        focusHours: ((user.totalFocusMinutes || 0) / 60).toFixed(1)
      },
      stats: {
        streakDays: user.streak || 0,
        xp: user.xp || 0,
        avgHealthScore,
        focusHoursFormatted: `${Math.floor((user.totalFocusMinutes || 0) / 60)}h ${(user.totalFocusMinutes || 0) % 60}m`,
        totalPlans: plans.length,
        missedTasksCount: missedCountTotal
      },
      activePlans: plans.slice(0, 3).map(p => {
        const pTasks = refreshedTasks.filter(t => String(t.planId) === String(p._id));
        const completed = pTasks.filter(t => t.status === 'completed').length;
        const progressPct = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;

        return {
          _id: p._id,
          title: p.title,
          category: p.category,
          healthScore: p.healthScore || 100,
          deadline: p.deadline,
          progressPct,
          status: p.status
        };
      }),
      todayFocus: {
        tasks: todayTasks,
        totalCount: todayTasks.length,
        completedCount: todayTasks.filter(t => t.status === 'completed').length,
        remainingMinutes: todayRemainingMinutes,
        remainingHoursFormatted: `${Math.floor(todayRemainingMinutes / 60)}h ${todayRemainingMinutes % 60}m`
      },
      notifications
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardData };
