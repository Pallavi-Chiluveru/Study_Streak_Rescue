const Task = require('../models/Task');
const Plan = require('../models/Plan');
const User = require('../models/User');

// @desc    Get user analytics and summary stats for charts
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const tasks = await Task.find({ userId });
    const plans = await Plan.find({ userId });

    const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const tasksMissed = tasks.filter(t => t.status === 'missed').length;
    const tasksRescheduled = tasks.filter(t => t.status === 'rescheduled').length;
    const totalFocusMinutes = user.totalFocusMinutes || 0;
    const currentStreak = user.streak || 0;

    const totalPlans = plans.length;
    const completedPlans = plans.filter(p => p.status === 'completed').length;
    const rescuedPlans = plans.reduce((sum, p) => sum + (p.rescueCount || 0), 0);

    const overallPlanCompletion = tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0;

    // Weekly Completed Tasks Chart Data (Last 7 Days)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];

      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      const completedOnDay = tasks.filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd).length;
      const focusOnDay = tasks
        .filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd)
        .reduce((sum, t) => sum + (t.actualFocusMinutes || t.estimatedMinutes || 30), 0);

      weeklyData.push({
        day: dayName,
        completed: completedOnDay,
        focusMinutes: focusOnDay
      });
    }

    // Plan Progress List for Recharts
    const planProgressData = plans.map(p => {
      const pTasks = tasks.filter(t => String(t.planId) === String(p._id));
      const pDone = pTasks.filter(t => t.status === 'completed').length;
      const pct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
      return {
        name: p.title.length > 18 ? p.title.substring(0, 18) + '...' : p.title,
        progress: pct,
        health: p.healthScore || 100
      };
    });

    res.json({
      overview: {
        tasksCompleted,
        tasksMissed,
        tasksRescheduled,
        totalFocusMinutes,
        focusHours: (totalFocusMinutes / 60).toFixed(1),
        currentStreak,
        totalPlans,
        completedPlans,
        rescuedPlans,
        overallPlanCompletion
      },
      weeklyData,
      planProgressData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics };
