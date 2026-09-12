const User = require('../models/User');
const { personalizeTask, getEffectiveEstimatedMinutes } = require('./adaptiveEstimationService');
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const { getStartOfDay, getDateRange, getAvailableDays, addCalendarDays, assertDateWithinRange } = require('../utils/dateUtils');
const { calculatePlanHealth } = require('./healthService');
const { checkFeasibility } = require('./feasibilityService');

/**
 * ⚡ RESCUE MY PLAN BACKEND ENGINE
 * Rebalances remaining pending and missed work across remaining days
 * strictly protecting completed tasks.
 */
const rescuePlan = async (planId, userId, updatedAvailableMinutesPerDay) => {
  const plan = await Plan.findOne({ _id: planId, userId });
  if (!plan) {
    throw new Error('Plan not found');
  }

  const user = await User.findById(userId);
  const allTasks = await Task.find({ planId });

  // 1. Completed tasks MUST NEVER change
  const completedTasks = allTasks.filter(t => t.status === 'completed');

  // 2. Collect unfinished work (pending, active, missed, rescheduled)
  const unfinishedTasks = allTasks.filter(t => t.status !== 'completed');

  // If no unfinished tasks exist, plan is completed
  if (unfinishedTasks.length === 0) {
    return {
      plan,
      completedCount: completedTasks.length,
      rescheduledCount: 0,
      daysRemaining: 0,
      newHealthScore: 100
    };
  }

  // 3. Updated daily time setup
  const dailyLimit = updatedAvailableMinutesPerDay || plan.availableMinutesPerDay;
  plan.availableMinutesPerDay = dailyLimit;

  // 4. Calculate remaining days from TODAY to deadline
  const today = getStartOfDay(new Date());
  const deadline = getStartOfDay(plan.deadline);

  // If deadline passed, extend deadline to at least 3 days from today so schedule is realistic
  let targetDeadline = deadline;
  if (deadline < today) {
    targetDeadline = addCalendarDays(today, 3);
    plan.deadline = targetDeadline;
  }

  const scheduleStart = getStartOfDay(plan.startDate) > today ? getStartOfDay(plan.startDate) : today;
  const remainingDates = getDateRange(scheduleStart, targetDeadline);
  const remainingDaysCount = remainingDates.length;

  // 5. Prioritize tasks: High priority first, then medium, then low
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  unfinishedTasks.sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));

  // 6. Redistribute unfinished tasks across remaining dates
  let currentDayIndex = 0;
  let currentDayAllocatedMinutes = 0;
  let rescheduledCount = 0;

  for (const task of unfinishedTasks) {
    Object.assign(task, personalizeTask(user, task));
    const taskMinutes = getEffectiveEstimatedMinutes(task);

    // Shift to next day if daily capacity exceeded and future dates exist
    if (
      currentDayAllocatedMinutes + taskMinutes > dailyLimit &&
      currentDayIndex < remainingDates.length - 1 &&
      currentDayAllocatedMinutes > 0
    ) {
      currentDayIndex++;
      currentDayAllocatedMinutes = 0;
    }

    const scheduledDate = remainingDates[currentDayIndex] || remainingDates[remainingDates.length - 1];
    currentDayAllocatedMinutes += taskMinutes;

    // Convert missed or pending tasks to rescheduled status
    task.scheduledDate = assertDateWithinRange(scheduledDate, scheduleStart, targetDeadline);
    task.status = 'rescheduled';
    task.wasRescheduled = true;
    await task.save();
    rescheduledCount++;
  }

  const remainingEstimatedMinutes = unfinishedTasks.reduce((sum, task) => sum + getEffectiveEstimatedMinutes(task), 0);
  const feasibility = checkFeasibility(scheduleStart, targetDeadline, dailyLimit, remainingEstimatedMinutes);
  plan.feasible = feasibility.isFeasible;
  plan.estimatedTotalMinutes = remainingEstimatedMinutes + completedTasks.reduce((sum, task) => sum + getEffectiveEstimatedMinutes(task), 0);
  // 7. Update plan state, rescue count and recalculate plan health
  plan.rescueCount = (plan.rescueCount || 0) + 1;

  // Re-fetch all tasks to calculate new health score
  const updatedAllTasks = await Task.find({ planId });
  const { healthScore, healthStatus } = calculatePlanHealth(plan, updatedAllTasks);

  plan.healthScore = healthScore;
  plan.healthHistory.push({ score: healthScore });
  plan.status = healthScore < 50 ? 'at_risk' : 'active';
  await plan.save();

  return {
    plan,
    completedTasks,
    rescheduledTasks: unfinishedTasks,
    completedCount: completedTasks.length,
    remainingCount: unfinishedTasks.length,
    rescheduledCount,
    daysRemaining: remainingDaysCount,
    dailyTargetMinutes: dailyLimit,
    remainingEstimatedMinutes,
    feasibility,
    newHealthScore: healthScore,
    healthStatus
  };
};

module.exports = {
  rescuePlan
};
